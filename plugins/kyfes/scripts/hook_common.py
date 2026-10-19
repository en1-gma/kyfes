"""Utility comuni agli hook di Claude Code e Codex: lettura dell'evento, progetto, file e testo scritti."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rules  # noqa: E402


def read_event() -> dict:
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}


def project_and_config(event: dict) -> Tuple[Path, Optional[dict]]:
    proj = rules.find_project_dir(event.get("cwd"))
    return proj, rules.load_config(proj)


# ---------------------------------------------------------------- operazioni sui file

@dataclass
class FileOp:
    """Una scrittura richiesta dall'agente su un file.

    `fragments` è il testo nuovo (sempre disponibile); `after` è il file intero dopo la modifica quando si può
    ricostruire (Write, Edit, MultiEdit, apply_patch), così le regole valutano il risultato e non solo il frammento.
    """
    path: str
    kind: str = "write"  # write | delete | move-from
    fragments: List[str] = field(default_factory=list)
    after: Optional[str] = None
    before: Optional[str] = None


def _read(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8", errors="replace") if path.is_file() else None
    except OSError:
        return None


def _abs(path: str, cwd: Optional[str]) -> Path:
    p = Path(path)
    return p if p.is_absolute() else Path(cwd or os.getcwd()) / p


def _apply_edits(text: str, edits: List[dict]) -> Optional[str]:
    for e in edits:
        old, new = e.get("old_string"), e.get("new_string")
        if not isinstance(old, str) or not isinstance(new, str):
            return None
        if old == "":
            text = new + text if text == "" else text
            continue
        if old not in text:
            return None
        text = text.replace(old, new) if e.get("replace_all") else text.replace(old, new, 1)
    return text


def _apply_hunks(text: str, hunks: List[List[str]]) -> Optional[str]:
    """Applica gli hunk di apply_patch (righe ' ', '-', '+'); None se il contesto non si trova."""
    lines = text.split("\n")
    pos = 0
    for hunk in hunks:
        old = [ln[1:] for ln in hunk if ln[:1] in (" ", "-")]
        new = [ln[1:] for ln in hunk if ln[:1] in (" ", "+")]
        if not old:
            lines[pos:pos] = new
            pos += len(new)
            continue
        found = -1
        for start in list(range(pos, len(lines) - len(old) + 1)) + list(range(0, pos)):
            if lines[start:start + len(old)] == old:
                found = start
                break
        if found < 0:
            return None
        lines[found:found + len(old)] = new
        pos = found + len(new)
    return "\n".join(lines)


def parse_apply_patch(patch: str, cwd: Optional[str] = None) -> List[FileOp]:
    """Codex apply_patch → operazioni. Add/Update ricostruiscono il file risultante quando possibile."""
    ops: List[FileOp] = []
    cur: Optional[FileOp] = None
    mode = ""
    hunks: List[List[str]] = []

    def flush() -> None:
        nonlocal cur, hunks
        if cur is None:
            return
        added = [ln[1:] for h in hunks for ln in h if ln.startswith("+")]
        cur.fragments = ["\n".join(added)]
        if mode == "add":
            cur.after = "\n".join(added)
        elif mode == "update":
            base = cur.before if cur.before is not None else ""
            cur.after = _apply_hunks(base, [h for h in hunks if h]) if cur.before is not None else None
        ops.append(cur)
        cur, hunks = None, []

    for line in patch.splitlines():
        if line.startswith("*** Add File: ") or line.startswith("*** Update File: "):
            flush()
            path = line.split(": ", 1)[1].strip()
            mode = "add" if line.startswith("*** Add") else "update"
            cur = FileOp(path, before=_read(_abs(path, cwd)))
            hunks = [[]]
        elif line.startswith("*** Move to: ") and cur is not None:
            dest = line.split(": ", 1)[1].strip()
            ops.append(FileOp(cur.path, kind="move-from"))
            cur.path = dest
        elif line.startswith("*** Delete File: "):
            flush()
            ops.append(FileOp(line.split(": ", 1)[1].strip(), kind="delete"))
        elif line.startswith("*** End Patch"):
            flush()
        elif cur is not None:
            if line.startswith("@@"):
                hunks.append([])
            elif line[:1] in (" ", "-", "+"):
                hunks[-1].append(line)
            elif line == "":
                hunks[-1].append(" ")
    flush()
    return ops


def file_ops(event: dict) -> List[FileOp]:
    """Scritture di Write/Edit/MultiEdit/NotebookEdit (Claude Code) e apply_patch (Codex)."""
    ti = event.get("tool_input") or {}
    cwd = event.get("cwd")
    if isinstance(ti, str):
        ti = {"command": ti}
    patch = ti.get("command") if isinstance(ti.get("command"), str) else ti.get("input")
    if isinstance(patch, str) and "*** Begin Patch" in patch:
        return parse_apply_patch(patch, cwd)
    path = None
    for key in ("file_path", "filePath", "path", "notebook_path"):
        if isinstance(ti.get(key), str):
            path = ti[key]
            break
    if not path:
        return []
    op = FileOp(path, before=_read(_abs(path, cwd)))
    for key in ("content", "new_string", "new_source"):
        if isinstance(ti.get(key), str):
            op.fragments.append(ti[key])
    edits = [e for e in ti.get("edits") or [] if isinstance(e, dict)]
    op.fragments += [e["new_string"] for e in edits if isinstance(e.get("new_string"), str)]
    if isinstance(ti.get("content"), str):
        op.after = ti["content"]
    elif isinstance(ti.get("old_string"), str):
        op.after = _apply_edits(op.before or "", [ti])
    elif edits:
        op.after = _apply_edits(op.before or "", edits)
    return [op]


def written_files(event: dict) -> Dict[str, List[str]]:
    """{percorso: [frammenti scritti]} (compatibilità: usato da post_edit e dai test)."""
    out: Dict[str, List[str]] = {}
    for op in file_ops(event):
        if op.kind == "write":
            out.setdefault(op.path, []).extend(op.fragments)
    return out


# ---------------------------------------------------------------- baseline git della sessione

def _git(proj: Path, *args: str) -> Optional[str]:
    try:
        r = subprocess.run(["git", *args], cwd=str(proj), capture_output=True, text=True, timeout=30)
    except Exception:
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def _session_key(event: dict) -> str:
    return "".join(c for c in str(event.get("session_id", "nosession")) if c.isalnum() or c in "-_")[:80]


def baseline_path(event: dict, proj: Path) -> Path:
    tag = "".join(c if c.isalnum() else "_" for c in str(proj))[-80:]
    return Path(tempfile.gettempdir()) / f"kyfes-base-{_session_key(event)}-{tag}"


def record_baseline(event: dict, proj: Path) -> None:
    """Salva HEAD alla prima occasione della sessione: lo stop gate confronta con questo, non solo con git status."""
    p = baseline_path(event, proj)
    if p.exists():
        return
    head = _git(proj, "rev-parse", "HEAD")
    if head:
        try:
            p.write_text(head)
        except OSError:
            pass


def debug_dump(event: dict, name: str) -> None:
    """Con KYFES_HOOK_DEBUG=1 salva il payload ricevuto, utile per verificare i campi."""
    if os.environ.get("KYFES_HOOK_DEBUG") == "1":
        p = Path(tempfile.gettempdir()) / f"kyfes-hook-{name}.json"
        try:
            p.write_text(json.dumps(event, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass
