#!/usr/bin/env python3
"""Stop / SubagentStop (Claude Code e Codex): impedisce di chiudere il lavoro finché i controlli non passano.

Esegue arch_check sull'intero progetto e i comandi in stop_gate.commands (lint, typecheck, test).
Anti-loop: dopo max_blocks rifiuti consecutivi nella stessa sessione lascia chiudere con un avviso.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import arch_check
import hook_common as hc

TIMEOUT_S = 600


def has_changes(proj: Path) -> bool:
    try:
        r = subprocess.run(["git", "status", "--porcelain"], cwd=str(proj), capture_output=True, text=True, timeout=30)
    except Exception:
        return True
    if r.returncode != 0:
        return True
    return bool(r.stdout.strip())


def counter_path(event: dict) -> Path:
    sid = "".join(c for c in str(event.get("session_id", "nosession")) if c.isalnum() or c in "-_")[:80]
    kind = "sub" if event.get("hook_event_name") == "SubagentStop" else "main"
    return Path(tempfile.gettempdir()) / f"kyfes-stop-{sid}-{kind}.count"


def main() -> int:
    event = hc.read_event()
    hc.debug_dump(event, "stop")
    proj, cfg = hc.project_and_config(event)
    if cfg is None:
        return 0
    gate = cfg.get("stop_gate") or {}
    if not gate.get("enabled", True):
        return 0
    if event.get("stop_hook_active") is True:
        return 0
    if gate.get("only_if_changes", True) and not has_changes(proj):
        return 0

    cnt_file = counter_path(event)
    try:
        count = int(cnt_file.read_text())
    except Exception:
        count = 0
    max_blocks = int(gate.get("max_blocks", 3))

    failures = []
    blocking = [f for f in arch_check.run(proj, cfg) if f.severity == "block"]
    if blocking:
        failures.append("arch_check:\n" + "\n".join(f.format() for f in blocking[:40]))
    for cmd in gate.get("commands") or []:
        try:
            r = subprocess.run(cmd, shell=True, cwd=str(proj), capture_output=True, text=True, timeout=TIMEOUT_S)
        except subprocess.TimeoutExpired:
            failures.append(f"{cmd}: oltre {TIMEOUT_S}s")
            continue
        if r.returncode != 0:
            failures.append(f"{cmd} (exit {r.returncode}):\n" + (r.stdout + r.stderr).strip()[-3000:])

    if not failures:
        cnt_file.unlink(missing_ok=True)
        return 0
    count += 1
    cnt_file.write_text(str(count))
    if count > max_blocks:
        cnt_file.unlink(missing_ok=True)
        print(json.dumps({"systemMessage": f"kyfes: controlli ancora falliti dopo {max_blocks} tentativi; "
                                           "chiusura consentita, ma il lavoro NON è conforme."}, ensure_ascii=False))
        return 0
    reason = ("I controlli frontend del progetto (kyfes) non passano. Correggi prima di chiudere "
              f"(tentativo {count}/{max_blocks}):\n\n" + "\n\n".join(failures))
    print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
