#!/usr/bin/env bash
# Registra il plugin kyfes nel Claude Code di questa macchina (i file per Codex sono già nel repository).
# Da eseguire una volta dopo aver clonato il progetto:  tools/kyfes/setup.sh
set -euo pipefail
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$KIT/../.." && pwd)"
SCOPE="${1:-local}"
cd "$REPO"
if command -v claude >/dev/null; then
  if claude plugin marketplace list 2>/dev/null | grep -q "kyfes"; then
    claude plugin marketplace update kyfes >/dev/null 2>&1 || true
  else
    claude plugin marketplace add "$KIT" --scope "$SCOPE" >/dev/null
  fi
  claude plugin install kyfes@kyfes --scope "$SCOPE" >/dev/null 2>&1 \
    || claude plugin update kyfes@kyfes >/dev/null 2>&1 || true
  echo "Claude Code: plugin kyfes attivo per questo repository (scope $SCOPE). Riavvia Claude Code."
else
  echo "Claude Code non trovato: salto la registrazione del plugin."
fi
if command -v codex >/dev/null; then
  echo "Codex: skill (.agents/skills), agenti (.codex/agents) e hook (.codex/hooks.json) sono nel repository."
  echo "       Alla prima apertura rendi il progetto trusted e approva gli hook di kyfes (/hooks)."
fi
