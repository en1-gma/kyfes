#!/usr/bin/env bash
# Verifica del kit: test degli hook e dell'installer; con --scaffolds anche ogni scaffold (install, lint, typecheck, test, build, arch_check).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python3 -B -m unittest discover -s "$ROOT/tests/hooks" -v
[ "${1:-}" = "--scaffolds" ] || exit 0
for fw in ${2:-react next vue angular svelte}; do
  src="$ROOT/plugins/kyfes/templates/scaffold/$fw"
  [ -d "$src" ] || { echo "scaffold $fw assente"; exit 1; }
  work="$(mktemp -d)"
  cp -R "$src/." "$work/"
  mkdir -p "$work/.kyfes" && echo "{\"framework\": \"$fw\"}" > "$work/.kyfes/config.json"
  echo "== $fw =="
  (cd "$work" && npm install --no-audit --no-fund && npm run lint && npm run typecheck && npm run test && npm run build)
  python3 -B "$ROOT/plugins/kyfes/scripts/arch_check.py" "$work" --strict
  rm -rf "$work"
done
