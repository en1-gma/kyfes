#!/usr/bin/env python3
"""SessionStart: registra HEAD all'inizio della sessione, così lo stop gate vede anche il lavoro già committato."""
from __future__ import annotations

import sys
from pathlib import Path

import hook_common as hc
import rules


def main() -> int:
    event = hc.read_event()
    hc.debug_dump(event, "session")
    cwd = Path(event.get("cwd") or ".").resolve()
    proj = rules.find_project_dir(str(cwd))
    projects = [proj] if rules.load_config(proj) is not None else rules.discover_projects(cwd)
    for p in projects:
        hc.record_baseline(event, p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
