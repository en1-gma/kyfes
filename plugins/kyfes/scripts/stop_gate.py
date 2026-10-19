#!/usr/bin/env python3
"""Stop / SubagentStop (Claude Code e Codex): impedisce di chiudere il lavoro finché i controlli non passano.

Esegue arch_check sull'intero progetto e i comandi in stop_gate.commands (lint, typecheck, test).

- Anti-loop: blocca fino a `max_blocks` volte di fila nella stessa catena di stop; poi lascia chiudere con un avviso
  esplicito. `stop_hook_active` (Claude sta continuando per un nostro blocco) NON sblocca il gate: serve solo a capire
  se la catena è nuova, e in quel caso il contatore riparte da zero.
- "Ci sono modifiche" non è solo `git status`: conta anche HEAD diverso da quello di inizio sessione e i commit non
  ancora pubblicati, così un commit non spegne il gate.
- Monorepo: se il cwd non è un progetto kyfes, controlla i progetti kyfes sotto il cwd.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import List, Optional

import arch_check
import hook_common as hc
import rules

TIMEOUT_S = 600


def has_changes(event: dict, proj: Path) -> bool:
    status = hc._git(proj, "status", "--porcelain")
    if status is None:
        return True  # non è un repository git (o git non risponde): controlla sempre
    if status:
        return True
    head = hc._git(proj, "rev-parse", "HEAD")
    base_file = hc.baseline_path(event, proj)
    if base_file.is_file():
        try:
            return base_file.read_text().strip() != head
        except OSError:
            return True
    # nessuna baseline (prima azione della sessione): commit locali non presenti su nessun remote
    unpublished = hc._git(proj, "rev-list", "--count", "HEAD", "--not", "--remotes")
    return unpublished is None or unpublished != "0"


def counter_path(event: dict, proj: Path) -> Path:
    kind = "sub" if event.get("hook_event_name") == "SubagentStop" else "main"
    tag = "".join(c if c.isalnum() else "_" for c in str(proj))[-80:]
    return Path(tempfile.gettempdir()) / f"kyfes-stop-{hc._session_key(event)}-{kind}-{tag}.count"


def run_checks(proj: Path, cfg: dict) -> List[str]:
    failures = []
    blocking = [f for f in arch_check.run(proj, cfg) if f.severity == "block"]
    if blocking:
        failures.append("arch_check:\n" + "\n".join(f.format() for f in blocking[:40]))
    for cmd in (cfg.get("stop_gate") or {}).get("commands") or []:
        try:
            r = subprocess.run(cmd, shell=True, cwd=str(proj), capture_output=True, text=True, timeout=TIMEOUT_S)
        except subprocess.TimeoutExpired:
            failures.append(f"{cmd}: oltre {TIMEOUT_S}s")
            continue
        if r.returncode != 0:
            failures.append(f"{cmd} (exit {r.returncode}):\n" + (r.stdout + r.stderr).strip()[-3000:])
    return failures


def gate(event: dict, proj: Path, cfg: dict) -> Optional[dict]:
    gate_cfg = cfg.get("stop_gate") or {}
    if not gate_cfg.get("enabled", True):
        return None
    cnt_file = counter_path(event, proj)
    if gate_cfg.get("only_if_changes", True) and not has_changes(event, proj):
        cnt_file.unlink(missing_ok=True)
        return None
    count = 0
    if event.get("stop_hook_active") is True:
        try:
            count = int(cnt_file.read_text())
        except Exception:
            count = 0
    max_blocks = int(gate_cfg.get("max_blocks", 3))
    failures = run_checks(proj, cfg)
    if not failures:
        cnt_file.unlink(missing_ok=True)
        return None
    count += 1
    if count > max_blocks:
        cnt_file.unlink(missing_ok=True)
        return {"systemMessage": f"kyfes ({proj.name}): controlli ancora falliti dopo {max_blocks} tentativi; "
                                 "chiusura consentita, ma il lavoro NON è conforme."}
    cnt_file.write_text(str(count))
    where = f" in {proj.name}" if proj.name else ""
    return {"decision": "block",
            "reason": (f"I controlli frontend del progetto (kyfes){where} non passano. Correggi prima di chiudere "
                       f"(tentativo {count}/{max_blocks}):\n\n" + "\n\n".join(failures))}


def main() -> int:
    event = hc.read_event()
    hc.debug_dump(event, "stop")
    cwd = Path(event.get("cwd") or ".").resolve()
    proj = rules.find_project_dir(str(cwd))
    projects = [proj] if rules.load_config(proj) is not None else rules.discover_projects(cwd)
    blocks, notes = [], []
    for p in projects:
        cfg = rules.load_config(p)
        if cfg is None:
            continue
        out = gate(event, p, cfg)
        if not out:
            continue
        if out.get("decision") == "block":
            blocks.append(out["reason"])
        else:
            notes.append(out["systemMessage"])
    if blocks:
        print(json.dumps({"decision": "block", "reason": "\n\n".join(blocks)}, ensure_ascii=False))
    elif notes:
        print(json.dumps({"systemMessage": "\n".join(notes)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
