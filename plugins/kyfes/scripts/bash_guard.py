#!/usr/bin/env python3
"""PreToolUse su Bash (Claude Code) e sulla shell di Codex: chiude le scritture che aggirerebbero gli hook di kyfes.

Nega:
- qualsiasi comando non di sola lettura che tocca i file protetti (.kyfes/, tools/kyfes/, impostazioni e hook
  dell'agente, CI di kyfes) o che prova a disattivare gli hook (`disableAllHooks`);
- le scritture dirette nel codice sorgente o nei file .env (redirect `>`, `tee`, `sed -i`, `cp`/`mv` verso src, `curl -o`,
  `python -c`/`node -e` che scrivono file, `git apply`/`patch`): il codice si scrive con Write/Edit/apply_patch, così le
  regole valutano il contenuto.

È un controllo euristico: la rete finale resta lo stop gate (arch_check + lint + typecheck + test) e la CI.
"""
from __future__ import annotations

import json
import os
import re
import shlex
import sys
from pathlib import Path
from typing import List, Optional

import hook_common as hc
import rules

PROTECTED_RE = re.compile(
    r"\.kyfes\b|tools/kyfes\b|\.codex/(?:hooks\.json|config\.toml|agents)|\.claude/(?:settings(?:\.local)?\.json|rules/kyfes)"
    r"|\.agents/skills/kyfes|kyfes-check\.ya?ml|disableallhooks|claude_project_dir|kyfes_project_dir", re.I)

# Invocazioni legittime del kit: eseguire i controlli e (senza --force/--uninstall) l'installer.
KIT_RUN_RE = re.compile(
    r"(?:python3?|py)\s+(?:-B\s+|-I\s+)*\S*tools/kyfes/plugins/kyfes/scripts/(?:arch_check|stop_gate)\.py(?:[ \t]+[^;&|<>\n]*)?"
    r"|(?:bash\s+|sh\s+)?\S*(?:tools/kyfes/setup\.sh)(?:[ \t]+(?:local|project|user))?", re.I)
INSTALL_RE = re.compile(r"(?:bash\s+)?\S*install\.sh\b([^;&|\n]*)")

READONLY_CMDS = {"cat", "less", "more", "head", "tail", "ls", "grep", "egrep", "fgrep", "rg", "wc", "diff", "stat",
                 "file", "jq", "echo", "printf", "test", "[", "cd", "pwd", "realpath", "readlink", "tree", "du",
                 "sha256sum", "shasum", "md5", "md5sum", "true"}
# git che non riscrive file del working tree (commit e push registrano solo ciò che è già su disco)
READONLY_GIT = {"diff", "log", "status", "show", "blame", "ls-files", "rev-parse", "grep", "add", "commit", "push", "fetch"}
SEGMENT_SPLIT = re.compile(r"\|\||&&|[;|\n]")
REDIRECT_RE = re.compile(r"(?:^|[^0-9&>])(?:[0-9]?)>{1,2}\|?\s*([^\s;|&<>]+)")
SAFE_REDIRECT = {"/dev/null", "/dev/stderr", "/dev/stdout", "&1", "&2"}


def command_text(event: dict) -> str:
    ti = event.get("tool_input") or {}
    if isinstance(ti, str):
        return ti
    cmd = ti.get("command") if isinstance(ti, dict) else None
    if isinstance(cmd, list):
        cmd = " ".join(str(c) for c in cmd)
    return cmd if isinstance(cmd, str) else ""


def normalize(cmd: str) -> str:
    """Toglie quoting ed escape che servono solo a spezzare i nomi (`.ky''fes`, `.k\\yfes`, `$'\\x2e'kyfes` resta visibile)."""
    out = re.sub(r"\$'([^']*)'", r"\1", cmd)
    out = out.replace("\\\n", " ")
    out = re.sub(r"\\(.)", r"\1", out)
    return out.replace("'", "").replace('"', "")


def _is_readonly_segment(seg: str) -> bool:
    try:
        words = shlex.split(seg, posix=True)
    except ValueError:
        words = seg.split()
    if words and re.fullmatch(r"[A-Za-z_]\w*=\S*", words[0]):
        return False  # assegnazioni di variabili d'ambiente prima del comando: non è sola lettura
    if not words:
        return True
    head = os.path.basename(words[0])
    if head == "git":
        return len(words) > 1 and words[1] in READONLY_GIT
    if head == "find":
        return not any(w in ("-delete", "-exec", "-execdir", "-ok", "-okdir", "-fprint", "-fprintf", "-fls") for w in words)
    return head in READONLY_CMDS


def readonly(cmd: str) -> bool:
    if any(t not in SAFE_REDIRECT for t in REDIRECT_RE.findall(cmd)):
        return False
    if re.search(r"`|\$\(", cmd):
        return False
    return all(_is_readonly_segment(seg) for seg in SEGMENT_SPLIT.split(cmd))


def _targets(cmd: str, cwd: Path) -> List[Path]:
    """Percorsi in cui il comando scrive direttamente, risolti seguendo i `cd` del comando."""
    found: List[Path] = []
    cur = cwd
    for seg in SEGMENT_SPLIT.split(cmd):
        try:
            words = shlex.split(seg, posix=True)
        except ValueError:
            words = seg.split()
        if not words:
            continue
        head = os.path.basename(words[0])
        if head in ("cd", "pushd") and len(words) > 1:
            cur = (cur / os.path.expanduser(words[1])).resolve()
            continue
        seg_found: List[str] = [t for t in REDIRECT_RE.findall(seg) if t not in SAFE_REDIRECT]
        args = [w for w in words[1:] if not w.startswith("-")]
        if head == "tee":
            seg_found += args
        elif head in ("sed", "perl") and any(w.startswith("-i") or w.startswith("--in-place") for w in words[1:]):
            seg_found += args[1:] if head == "sed" else args
        elif head in ("cp", "mv", "install", "ln", "rsync", "dd", "truncate", "touch") and args:
            seg_found += [a[3:] if a.startswith("of=") else a for a in args[-1:]] if head != "truncate" else args
        elif head in ("curl", "wget", "tar", "bsdtar", "unzip", "7z"):
            for i, w in enumerate(words):
                if w in ("-o", "--output", "-O", "--output-document", "-C", "--directory", "-d") and i + 1 < len(words):
                    seg_found.append(words[i + 1])
                elif w.startswith(("--directory=", "--output=")):
                    seg_found.append(w.split("=", 1)[1])
        found += [cur / os.path.expanduser(t) for t in seg_found]
    return found


def _rel(path: Path, proj: Path) -> Optional[str]:
    return rules.rel_to_project(str(path), proj)


def check(cmd: str, cwd: Path, proj: Path, cfg: dict) -> List[str]:
    reasons: List[str] = []
    norm = normalize(cmd)
    stripped = KIT_RUN_RE.sub(" ", norm)
    for m in INSTALL_RE.finditer(stripped):
        if re.search(r"--(?:force|uninstall)\b", m.group(1)):
            reasons.append("install.sh con --force o --uninstall lo esegue solo l'utente")
    stripped = INSTALL_RE.sub(" ", stripped)
    if PROTECTED_RE.search(stripped) and not readonly(stripped):
        reasons.append("il comando tocca file protetti di kyfes (configurazione, kit, hook o impostazioni dell'agente): "
                       "li modifica solo l'utente")
    src_root = cfg.get("src_root", "src").rstrip("/") + "/"
    for target in _targets(norm, cwd):
        rel = _rel(target, proj)
        if rel is None:
            continue
        in_src = rel == src_root.rstrip("/") or rel.startswith(src_root)
        # una cartella (destinazione di mv/cp/tar/unzip) in src può ricevere file di codice
        code_or_dir = rel.endswith(rules.SCANNED_EXT) or target.is_dir() or not Path(rel).suffix
        if rules.protected_reason(rel):
            reasons.append(f"scrittura via shell su un file protetto ({rel})")
        elif (in_src and code_or_dir) or rules.is_env_file(rel):
            reasons.append(f"scrittura via shell di {rel}: il codice e i .env si scrivono con Write/Edit, "
                           "così le regole di kyfes valutano il contenuto")
    if re.search(r"\b(?:python3?|node|deno|bun|ruby|perl)\s+(?:-\w+\s+)*-(?:c|e)\b", norm) \
            and re.search(r"\b(?:open|writeFile\w*|write_text|createWriteStream|appendFile\w*)\s*\(", norm) \
            and (src_root in norm or ".env" in norm or PROTECTED_RE.search(norm)):
        reasons.append("script inline che scrive file nel codice sorgente: usa Write/Edit")
    if re.search(r"\bgit\s+(?:apply|am)\b|(?:^|[;&|]\s*)patch\s", norm):
        reasons.append("git apply/patch scrivono codice senza passare dai controlli: applica le modifiche con Write/Edit")
    return reasons


def main() -> int:
    event = hc.read_event()
    hc.debug_dump(event, "bash")
    cmd = command_text(event)
    if not cmd.strip():
        return 0
    cwd = Path(event.get("cwd") or os.getcwd()).resolve()
    projects = [rules.find_project_dir(str(cwd))]
    if rules.load_config(projects[0]) is None:
        projects = rules.discover_projects(cwd)
    reasons: List[str] = []
    for proj in projects:
        cfg = rules.load_config(proj)
        if cfg is None:
            continue
        hc.record_baseline(event, proj)
        if cfg["rules"].get("protected-files", "block") == "off":
            continue
        for r in check(cmd, cwd, proj, cfg):
            if r not in reasons:
                reasons.append(r)
    if not reasons:
        return 0
    reason = ("Comando rifiutato dalle regole del progetto (kyfes):\n" + "\n".join(f"- {r}" for r in reasons)
              + "\nNon aggirare i controlli: usa Write/Edit per il codice e chiedi all'utente per i file protetti.")
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                             "permissionDecisionReason": reason}}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
