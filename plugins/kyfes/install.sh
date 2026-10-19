#!/usr/bin/env bash
# Installer di kyfes: regole, agenti e controlli automatici per frontend, per Claude Code e Codex.
#
# Uso:
#   ./install.sh [--target DIR] [--framework react|next|vue|angular|svelte] [--agents claude|codex|both]
#                [--pm npm|pnpm|yarn|bun] [--scaffold] [--ci github|none] [--scope local|project|user]
#                [--no-plugin] [--force] [--uninstall]
#
# Rilanciarlo è sicuro: aggiorna il kit, rigenera i blocchi in CLAUDE.md e AGENTS.md e non sovrascrive
# configurazione, regole o file dello scaffold esistenti (salvo --force).
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # cartella del plugin
TARGET="."
FRAMEWORK=""
AGENTS="both"
PM=""
SCAFFOLD=0
CI="github"
SCOPE="local"
NO_PLUGIN=0
FORCE=0
UNINSTALL=0
KIT_REL="tools/kyfes"

die()  { printf '\033[31mErrore:\033[0m %s\n' "$*" >&2; exit 1; }
info() { printf '\033[36m•\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }

while [ $# -gt 0 ]; do
  case "$1" in
    --target)    TARGET="${2:?manca la cartella}"; shift 2 ;;
    --framework) FRAMEWORK="${2:?}"; shift 2 ;;
    --agents)    AGENTS="${2:?}"; shift 2 ;;
    --pm)        PM="${2:?}"; shift 2 ;;
    --scaffold)  SCAFFOLD=1; shift ;;
    --ci)        CI="${2:?}"; shift 2 ;;
    --scope)     SCOPE="${2:?}"; shift 2 ;;
    --no-plugin) NO_PLUGIN=1; shift ;;
    --force)     FORCE=1; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    -h|--help)   usage ;;
    *) die "opzione sconosciuta: $1" ;;
  esac
done

command -v python3 >/dev/null || die "serve python3 (solo libreria standard)"
mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"
case "$AGENTS" in claude|codex|both) ;; *) die "--agents: claude, codex o both" ;; esac
want_claude() { [ "$AGENTS" = claude ] || [ "$AGENTS" = both ]; }
want_codex()  { [ "$AGENTS" = codex ]  || [ "$AGENTS" = both ]; }

# ------------------------------------------------------------------ blocchi gestiti in CLAUDE.md / AGENTS.md
write_block() {  # $1 file, $2 sorgente del blocco (vuota = rimuovi)
  python3 - "$1" "$2" <<'PY'
import re, sys, pathlib
path, src = pathlib.Path(sys.argv[1]), sys.argv[2]
text = path.read_text(encoding="utf-8") if path.exists() else ""
block = pathlib.Path(src).read_text(encoding="utf-8").strip() + "\n" if src else ""
pat = re.compile(r"<!-- kyfes:start.*?<!-- kyfes:end -->\n?", re.S)
if pat.search(text):
    text = pat.sub(lambda _: block, text)
elif block:
    text = (text.rstrip() + "\n\n" if text.strip() else "") + block
if text.strip():
    path.write_text(text, encoding="utf-8")
elif path.exists():
    path.unlink()
PY
}

merge_codex_hooks() {  # $1 sorgente, $2 destinazione (.codex/hooks.json), $3 remove|add
  python3 - "$1" "$2" "$3" <<'PY'
import json, sys, pathlib
src, dst, mode = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3]
ours = json.loads(src.read_text(encoding="utf-8"))["hooks"]
cur = json.loads(dst.read_text(encoding="utf-8")) if dst.exists() else {"hooks": {}}
hooks = cur.setdefault("hooks", {})
is_kyfes = lambda g: any("tools/kyfes/" in h.get("command", "") for h in g.get("hooks", []))
for ev in set(hooks) | set(ours):
    groups = [g for g in hooks.get(ev, []) if not is_kyfes(g)]
    if mode == "add":
        groups += ours.get(ev, [])
    if groups:
        hooks[ev] = groups
    else:
        hooks.pop(ev, None)
if hooks:
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(cur, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
elif dst.exists():
    dst.unlink()
PY
}

# Regole deny di Claude Code: seconda barriera (indipendente dagli hook) contro la modifica di config, kit e impostazioni.
merge_claude_permissions() {  # $1 .claude/settings.json, $2 add|remove
  python3 - "$1" "$2" <<'PY'
import json, sys, pathlib
dst, mode = pathlib.Path(sys.argv[1]), sys.argv[2]
ours = [f"Edit({p})" for p in (".kyfes/**", "/.kyfes/**", "tools/kyfes/**", "/tools/kyfes/**",
                               ".claude/settings.json", "/.claude/settings.json",
                               ".claude/settings.local.json", "/.claude/settings.local.json")]
cur = json.loads(dst.read_text(encoding="utf-8")) if dst.exists() else {}
perms = cur.setdefault("permissions", {})
deny = [r for r in perms.get("deny", []) if r not in ours]
if mode == "add":
    deny += ours
if deny:
    perms["deny"] = deny
else:
    perms.pop("deny", None)
if not perms:
    cur.pop("permissions", None)
if cur:
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(cur, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
elif dst.exists():
    dst.unlink()
PY
}

# ------------------------------------------------------------------ disinstallazione
if [ "$UNINSTALL" = 1 ]; then
  info "Rimuovo kyfes da $TARGET"
  [ -f "$TARGET/CLAUDE.md" ] && write_block "$TARGET/CLAUDE.md" ""
  [ -f "$TARGET/AGENTS.md" ] && write_block "$TARGET/AGENTS.md" ""
  rm -rf "$TARGET/.claude/rules/kyfes" "$TARGET/.agents/skills/kyfes-"* "$TARGET/.codex/agents/kyfes_"*.toml
  [ -f "$TARGET/.claude/settings.json" ] && merge_claude_permissions "$TARGET/.claude/settings.json" remove
  [ -f "$TARGET/.codex/hooks.json" ] && merge_codex_hooks "$KIT_DIR/templates/codex-hooks.json" "$TARGET/.codex/hooks.json" remove
  rm -f "$TARGET/.github/workflows/kyfes-check.yml"
  rm -rf "$TARGET/${KIT_REL:?}"
  [ "$FORCE" = 1 ] && rm -rf "$TARGET/.kyfes"
  if command -v claude >/dev/null && [ "$NO_PLUGIN" = 0 ]; then
    (cd "$TARGET" && claude plugin uninstall kyfes@kyfes --scope "$SCOPE" >/dev/null 2>&1 || true)
  fi
  ok "kyfes rimosso (configurazione .kyfes/ conservata salvo --force)"
  exit 0
fi

# ------------------------------------------------------------------ rilevamento framework e package manager
detect_framework() {
  local pj="$TARGET/package.json"
  [ -f "$pj" ] || return 0
  python3 - "$pj" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
deps = {**d.get("dependencies", {}), **d.get("devDependencies", {})}
for key, fw in (("next", "next"), ("@angular/core", "angular"), ("@sveltejs/kit", "svelte"), ("vue", "vue"), ("react", "react")):
    if key in deps:
        print(fw); break
PY
}
[ -n "$FRAMEWORK" ] || FRAMEWORK="$(detect_framework)"
[ -n "$FRAMEWORK" ] || die "framework non rilevato: usa --framework react|next|vue|angular|svelte"
case "$FRAMEWORK" in react|next|vue|angular|svelte) ;; *) die "framework non supportato: $FRAMEWORK" ;; esac

if [ -z "$PM" ]; then
  if   [ -f "$TARGET/pnpm-lock.yaml" ]; then PM=pnpm
  elif [ -f "$TARGET/yarn.lock" ]; then PM=yarn
  elif [ -f "$TARGET/bun.lockb" ] || [ -f "$TARGET/bun.lock" ]; then PM=bun
  else PM=npm; fi
fi
case "$PM" in
  npm)  PM_CI="npm ci"; PM_AUDIT="npm audit --omit=dev --audit-level=high" ;;
  pnpm) PM_CI="pnpm install --frozen-lockfile"; PM_AUDIT="pnpm audit --prod --audit-level high" ;;
  yarn) PM_CI="yarn install --immutable"; PM_AUDIT="yarn npm audit --environment production --severity high" ;;
  bun)  PM_CI="bun install --frozen-lockfile"; PM_AUDIT="bun audit --audit-level=high" ;;
  *) die "package manager non supportato: $PM" ;;
esac
info "Progetto: $TARGET — framework $FRAMEWORK, package manager $PM, agenti $AGENTS"

# ------------------------------------------------------------------ copia versionata del kit
KIT_DST="$TARGET/$KIT_REL"
if [ "$KIT_DIR" != "$KIT_DST/plugins/kyfes" ]; then
  rm -rf "$KIT_DST"
  mkdir -p "$KIT_DST/plugins" "$KIT_DST/.claude-plugin" "$KIT_DST/.agents/plugins"
  (cd "$KIT_DIR/.." && tar --exclude='kyfes/templates/scaffold' --exclude='__pycache__' -cf - kyfes) | (cd "$KIT_DST/plugins" && tar -xf -)
  cat > "$KIT_DST/.claude-plugin/marketplace.json" <<'EOF'
{
  "name": "kyfes",
  "owner": { "name": "kyfes" },
  "plugins": [{ "name": "kyfes", "source": "./plugins/kyfes", "description": "Know Your Frontend: frontend rules, hooks and agents." }]
}
EOF
  cat > "$KIT_DST/.agents/plugins/marketplace.json" <<'EOF'
{
  "name": "kyfes",
  "plugins": [{ "name": "kyfes", "source": { "source": "local", "path": "./plugins/kyfes" } }]
}
EOF
  cp "$KIT_DIR/templates/setup.sh" "$KIT_DST/setup.sh" && chmod +x "$KIT_DST/setup.sh"
  ok "kit copiato in $KIT_REL/ (usato da CI, hook Codex e colleghi)"
fi

# ------------------------------------------------------------------ configurazione
CFG="$TARGET/.kyfes/config.json"
if [ ! -f "$CFG" ] || [ "$FORCE" = 1 ]; then
  mkdir -p "$TARGET/.kyfes"
  sed -e "s/__FRAMEWORK__/$FRAMEWORK/g" -e "s/__PM__/$PM/g" "$KIT_DIR/templates/kyfes.config.json" > "$CFG"
  ok ".kyfes/config.json creato"
else
  info ".kyfes/config.json esistente: non modificato"
fi

BLOCK_SRC="$(mktemp)"
trap 'rm -f "$BLOCK_SRC"' EXIT
sed "s/__FRAMEWORK__/$FRAMEWORK/g" "$KIT_DIR/templates/AGENTS.kyfes.md" > "$BLOCK_SRC"

# ------------------------------------------------------------------ Claude Code
if want_claude; then
  mkdir -p "$TARGET/.claude/rules/kyfes"
  for f in "$KIT_DIR"/templates/rules/*.md; do
    dst="$TARGET/.claude/rules/kyfes/$(basename "$f")"
    if [ ! -f "$dst" ] || [ "$FORCE" = 1 ]; then cp "$f" "$dst"; fi
  done
  write_block "$TARGET/CLAUDE.md" "$BLOCK_SRC"
  merge_claude_permissions "$TARGET/.claude/settings.json" add
  ok "Claude Code: .claude/rules/kyfes/, blocco in CLAUDE.md, regole deny in .claude/settings.json"
  if [ "$NO_PLUGIN" = 0 ]; then
    if command -v claude >/dev/null; then
      bash "$KIT_DST/setup.sh" "$SCOPE" >/dev/null 2>&1 && ok "Claude Code: plugin kyfes registrato (scope $SCOPE)" \
        || warn "registrazione del plugin non riuscita: esegui $KIT_REL/setup.sh"
    else
      warn "comando 'claude' non trovato: installa il plugin con /plugin marketplace add en1-gma/kyfes"
    fi
  fi
fi

# ------------------------------------------------------------------ Codex
if want_codex; then
  write_block "$TARGET/AGENTS.md" "$BLOCK_SRC"
  mkdir -p "$TARGET/.agents/skills" "$TARGET/.codex/agents"
  for s in "$KIT_DIR"/skills/*/; do
    name="$(basename "$s")"
    rm -rf "$TARGET/.agents/skills/$name"
    cp -R "$s" "$TARGET/.agents/skills/$name"
  done
  for a in "$KIT_DIR"/templates/codex-agents/*.toml; do
    cp "$a" "$TARGET/.codex/agents/$(basename "$a")"
  done
  merge_codex_hooks "$KIT_DIR/templates/codex-hooks.json" "$TARGET/.codex/hooks.json" add
  ok "Codex: blocco in AGENTS.md, .agents/skills/kyfes-*, .codex/agents/kyfes_*.toml, .codex/hooks.json"
  info "Codex: rendi il progetto trusted e approva gli hook di kyfes alla prima apertura"
fi

# ------------------------------------------------------------------ CI
if [ "$CI" = github ]; then
  mkdir -p "$TARGET/.github/workflows"
  WF="$TARGET/.github/workflows/kyfes-check.yml"
  if [ ! -f "$WF" ] || [ "$FORCE" = 1 ]; then
    sed -e "s/__PM_CI__/$PM_CI/g" -e "s/__PM_AUDIT__/$PM_AUDIT/g" -e "s/__PM__/$PM/g" "$KIT_DIR/templates/ci/kyfes-check.yml" > "$WF"
    ok "CI: .github/workflows/kyfes-check.yml"
  fi
fi

# ------------------------------------------------------------------ scaffold di riferimento
if [ "$SCAFFOLD" = 1 ]; then
  SRC="$KIT_DIR/templates/scaffold/$FRAMEWORK"
  [ -d "$SRC" ] || die "scaffold per $FRAMEWORK non disponibile in questa versione del kit"
  copied=0; skipped=0
  while IFS= read -r -d '' f; do
    rel="${f#"$SRC"/}"
    dst="$TARGET/$rel"
    if [ -e "$dst" ] && [ "$FORCE" = 0 ]; then skipped=$((skipped + 1)); continue; fi
    mkdir -p "$(dirname "$dst")"
    cp "$f" "$dst"; copied=$((copied + 1))
  done < <(find "$SRC" -type f -print0)
  ok "scaffold $FRAMEWORK: $copied file copiati, $skipped già presenti (non sovrascritti)"
  info "poi: $PM install && $PM run dev"
fi

ok "kyfes installato. Controllo completo: python3 -B $KIT_REL/plugins/kyfes/scripts/arch_check.py ."
