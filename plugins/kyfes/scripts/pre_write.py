#!/usr/bin/env python3
"""PreToolUse su Write/Edit/MultiEdit (Claude Code) e apply_patch (Codex): nega le scritture che violano regole bloccanti."""
from __future__ import annotations

import json
import sys

import hook_common as hc
import rules


def main() -> int:
    event = hc.read_event()
    hc.debug_dump(event, "pre")
    proj, cfg = hc.project_and_config(event)
    if cfg is None:
        return 0  # progetto senza kyfes: nessun controllo
    findings = []
    for path, frags in hc.written_files(event).items():
        rel = rules.rel_to_project(path, proj)
        if rel is None:
            continue
        findings += rules.check_protected(rel, cfg)
        findings += rules.check_layout(rel, cfg)
        for frag in frags:
            findings += rules.check_content(rel, frag, cfg)
    blocking = [f for f in findings if f.severity == "block"]
    if not blocking:
        return 0
    reason = ("Scrittura rifiutata dalle regole frontend del progetto (kyfes):\n"
              + "\n".join(f.format() for f in blocking)
              + "\nCorreggi l'approccio secondo la skill kyfes-architecture invece di aggirare il controllo.")
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
