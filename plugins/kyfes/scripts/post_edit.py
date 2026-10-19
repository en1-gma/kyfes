#!/usr/bin/env python3
"""PostToolUse: rilegge i file appena scritti e restituisce all'agente gli avvisi (regole 'warn')."""
from __future__ import annotations

import json
import sys

import hook_common as hc
import rules


def main() -> int:
    event = hc.read_event()
    hc.debug_dump(event, "post")
    proj, cfg = hc.project_and_config(event)
    if cfg is None:
        return 0
    findings = []
    for path in hc.written_files(event):
        rel = rules.rel_to_project(path, proj)
        if rel is None:
            continue
        p = proj / rel
        if p.is_file():
            try:
                findings += rules.check_content(rel, p.read_text(encoding="utf-8", errors="replace"), cfg)
            except OSError:
                pass
    notes = [f for f in findings if f.severity in ("warn", "block")]
    if not notes:
        return 0
    ctx = "kyfes — da sistemare prima di chiudere il lavoro:\n" + "\n".join(f.format() for f in notes[:30])
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": ctx}},
                     ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
