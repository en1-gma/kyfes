"""Utility comuni agli hook di Claude Code e Codex: lettura dell'evento, progetto, file e testo scritti."""
from __future__ import annotations

import json
import os
import sys
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


def parse_apply_patch(patch: str) -> Dict[str, List[str]]:
    """Codex apply_patch: {file: [testo aggiunto]}. Le righe '+' sono il nuovo contenuto."""
    out: Dict[str, List[str]] = {}
    current: Optional[str] = None
    buf: List[str] = []

    def flush() -> None:
        if current is not None:
            out.setdefault(current, []).append("\n".join(buf))

    for line in patch.splitlines():
        if line.startswith("*** Add File: ") or line.startswith("*** Update File: "):
            flush()
            current, buf = line.split(": ", 1)[1].strip(), []
        elif line.startswith("*** Move to: ") and current is not None:
            flush()
            current, buf = line.split(": ", 1)[1].strip(), []
        elif line.startswith("*** Delete File: ") or line.startswith("*** End Patch"):
            flush()
            current, buf = None, []
        elif current is not None and line.startswith("+"):
            buf.append(line[1:])
    flush()
    return out


def written_files(event: dict) -> Dict[str, List[str]]:
    """{percorso: [frammenti scritti]} per Write/Edit/MultiEdit (Claude Code) e apply_patch (Codex)."""
    ti = event.get("tool_input") or {}
    if isinstance(ti, str):
        ti = {"command": ti}
    patch = ti.get("command") if isinstance(ti.get("command"), str) else ti.get("input")
    if isinstance(patch, str) and "*** Begin Patch" in patch:
        return parse_apply_patch(patch)
    path = None
    for key in ("file_path", "filePath", "path", "notebook_path"):
        if isinstance(ti.get(key), str):
            path = ti[key]
            break
    if not path:
        return {}
    frags: List[str] = []
    for key in ("content", "new_string", "new_source"):
        if isinstance(ti.get(key), str):
            frags.append(ti[key])
    for e in ti.get("edits") or []:
        if isinstance(e, dict) and isinstance(e.get("new_string"), str):
            frags.append(e["new_string"])
    return {path: frags}


def debug_dump(event: dict, name: str) -> None:
    """Con KYFES_HOOK_DEBUG=1 salva il payload ricevuto, utile per verificare i campi."""
    if os.environ.get("KYFES_HOOK_DEBUG") == "1":
        import tempfile
        p = Path(tempfile.gettempdir()) / f"kyfes-hook-{name}.json"
        try:
            p.write_text(json.dumps(event, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass
