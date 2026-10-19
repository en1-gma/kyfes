#!/usr/bin/env python3
"""PreToolUse su Write/Edit/MultiEdit/NotebookEdit (Claude Code) e apply_patch (Codex): nega le scritture che violano regole bloccanti.

Le regole valutano il file come sarà DOPO la modifica (non solo il frammento scritto): togliere `sanitizeHtml(...)` con
un Edit viene visto. Le violazioni già presenti prima della modifica non bloccano l'edit (le segnala lo stop gate).
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from typing import List

import hook_common as hc
import rules


def _key(f: rules.Finding, text: str) -> tuple:
    lines = text.splitlines()
    src = lines[f.line - 1].strip() if 0 < f.line <= len(lines) else ""
    return f.rule, src


def new_findings(rel: str, op: hc.FileOp, cfg: dict) -> List[rules.Finding]:
    if op.after is None:
        out: List[rules.Finding] = []
        for frag in op.fragments:
            out += rules.check_content(rel, frag, cfg)
        return out
    after = rules.check_content(rel, op.after, cfg)
    if not op.before:
        return after
    # solo ciò che la modifica introduce: stessa regola sulla stessa riga di codice = già presente
    seen = Counter(_key(f, op.before) for f in rules.check_content(rel, op.before, cfg))
    out = []
    for f in after:
        k = _key(f, op.after)
        if seen[k] > 0:
            seen[k] -= 1
        else:
            out.append(f)
    return out


def main() -> int:
    event = hc.read_event()
    hc.debug_dump(event, "pre")
    findings = []
    for op in hc.file_ops(event):
        proj = rules.project_for_file(op.path, event.get("cwd"))
        cfg = rules.load_config(proj)
        if cfg is None:
            continue  # file fuori da un progetto kyfes: nessun controllo
        hc.record_baseline(event, proj)
        rel = rules.rel_to_project(str(hc._abs(op.path, event.get("cwd"))), proj)
        if rel is None:
            continue
        findings += rules.check_protected(rel, cfg)
        if op.kind != "write":
            continue
        findings += rules.check_layout(rel, cfg)
        findings += new_findings(rel, op, cfg)
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
