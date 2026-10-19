#!/usr/bin/env python3
"""Controllo completo del progetto: sicurezza, confini delle librerie, livelli, struttura, duplicati.

Uso: python3 arch_check.py [PROGETTO] [--strict] [--json]
Esce con 1 se c'è almeno una violazione bloccante (con --strict anche per gli avvisi).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rules  # noqa: E402


def run(proj: Path, cfg: dict) -> list:
    return run_with_metrics(proj, cfg)[0]


def run_with_metrics(proj: Path, cfg: dict) -> tuple:
    """(findings, metriche): le metriche misurano il riuso delle costanti anche quando la soglia è rispettata."""
    findings = []
    texts = []
    all_texts = []
    feature_dirs = set()
    base_feat = cfg["layers"]["features"].rstrip("/") + "/"
    for rel, path in rules.iter_project_files(proj, cfg):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        findings += rules.check_layout(rel, cfg)
        findings += rules.check_content(rel, text, cfg)
        all_texts.append((rel, text))
        if not rules.is_test(rel) and rel.endswith(rules.CODE_EXT):
            texts.append((rel, text))
        if rel.startswith(base_feat):
            feature_dirs.add(rel[len(base_feat):].split("/")[0])
    sev = cfg["rules"].get("folder-layout", "block")
    for name in sorted(feature_dirs):
        if sev != "off" and not (proj / base_feat / name / "index.ts").is_file():
            findings.append(rules.Finding("folder-layout", sev, f"{base_feat}{name}", 0,
                                          "ogni feature espone la sua API pubblica in index.ts"))
    dsev = cfg["rules"].get("duplicates", "block")
    if dsev != "off":
        for rel, line, orel, oline in rules.find_duplicates(texts, int(cfg["duplicates"]["min_lines"])):
            findings.append(rules.Finding("duplicates", dsev, rel, line,
                                          f"blocco di {cfg['duplicates']['min_lines']}+ righe uguale a {orel}:{oline}: estrai in api/, shared/lib o shared/ui"))
    occ, dup = rules.constant_reuse(all_texts, cfg)
    reuse = rules.reuse_finding(occ, dup, cfg)
    if reuse:
        findings.append(reuse)
    metrics = {"constant_reuse": {"values": len(occ), "duplicated": len(dup),
                                  "ratio": round(len(dup) / len(occ), 4) if occ else 0.0,
                                  "max_ratio": float(cfg["constant_reuse"].get("max_duplicate_ratio", 0.10))}}
    return findings, metrics


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("project", nargs="?", default=".")
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    proj = Path(a.project).resolve()
    cfg = rules.load_config(proj)
    if cfg is None:
        print(f"kyfes: {rules.CONFIG_REL} non trovato in {proj}: nessun controllo")
        return 0
    findings, metrics = run_with_metrics(proj, cfg)
    if a.json:
        print(json.dumps({"findings": [f.__dict__ for f in findings], "metrics": metrics}, indent=2, ensure_ascii=False))
    else:
        for sevname, title in (("block", "Violazioni bloccanti"), ("warn", "Avvisi")):
            sel = [f for f in findings if f.severity == sevname]
            if sel:
                print(f"{title} ({len(sel)}):")
                print("\n".join(f.format() for f in sel))
        m = metrics["constant_reuse"]
        print(f"kyfes: riuso costanti — {m['duplicated']} valori duplicati su {m['values']} "
              f"({m['ratio']:.1%}, soglia {m['max_ratio']:.0%})")
        if not findings:
            print("kyfes: nessuna violazione")
    failing = [f for f in findings if f.severity == "block" or (a.strict and f.severity == "warn")]
    return 1 if failing else 0


if __name__ == "__main__":
    sys.exit(main())
