#!/usr/bin/env python3
"""PostToolUse: rilegge i file appena scritti e restituisce all'agente gli avvisi (regole 'warn')."""
from __future__ import annotations

import json
import sys

import hook_common as hc
import rules


def reuse_hints(proj, cfg: dict, rel: str) -> list:
    """Valori letterali del file appena scritto che esistono già altrove: vanno definiti una volta e referenziati."""
    if cfg["rules"].get("constant-reuse", "block") == "off" or not rules.counts_for_reuse(rel):
        return []
    files = []
    for frel, path in rules.iter_project_files(proj, cfg):
        try:
            files.append((frel, path.read_text(encoding="utf-8", errors="replace")))
        except OSError:
            continue
    occ, dup = rules.constant_reuse(files, cfg)
    mine = [(v, locs) for v, locs in dup.items() if any(loc.startswith(rel + ":") for loc in locs)]
    if not mine:
        return []
    ratio = len(dup) / len(occ) if occ else 0.0
    limit = float(cfg["constant_reuse"].get("max_duplicate_ratio", 0.10))
    head = (f"- [constant-reuse] {rel} — valori già scritti altrove (riuso costanti: {ratio:.1%} duplicati, "
            f"soglia {limit:.0%}, bloccante allo stop):")
    lines = [f"    '{v}': {', '.join(l for l in locs if not l.startswith(rel + ':'))[:200]}" for v, locs in mine[:15]]
    return [head, *lines]


def main() -> int:
    event = hc.read_event()
    hc.debug_dump(event, "post")
    findings = []
    reuse_notes = []
    for path in hc.written_files(event):
        proj = rules.project_for_file(path, event.get("cwd"))
        cfg = rules.load_config(proj)
        if cfg is None:
            continue
        rel = rules.rel_to_project(str(hc._abs(path, event.get("cwd"))), proj)
        if rel is None:
            continue
        p = proj / rel
        if p.is_file():
            try:
                findings += rules.check_content(rel, p.read_text(encoding="utf-8", errors="replace"), cfg)
            except OSError:
                pass
            reuse_notes += reuse_hints(proj, cfg, rel)
    notes = [f for f in findings if f.severity in ("warn", "block")]
    if not notes and not reuse_notes:
        return 0
    ctx = "kyfes — da sistemare prima di chiudere il lavoro:\n" + "\n".join(f.format() for f in notes[:30])
    if reuse_notes:
        ctx += "\n" + "\n".join(reuse_notes[:20])
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": ctx}},
                     ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
