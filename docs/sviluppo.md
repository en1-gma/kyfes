# Sviluppare il kit

```text
kyfes/
├── .claude-plugin/marketplace.json        ← marketplace Claude Code
├── .agents/plugins/marketplace.json       ← marketplace Codex
├── install.sh                             ← wrapper dell'installer
├── plugins/kyfes/
│   ├── .claude-plugin/plugin.json         ← manifest Claude Code
│   ├── .codex-plugin/plugin.json          ← manifest Codex
│   ├── skills/                            ← kyfes-architecture (+ references/<framework>.md), kyfes-init, kyfes-plan, kyfes-review
│   ├── agents/                            ← architect, implementer, reviewer (Claude Code)
│   ├── hooks/hooks.json                   ← hook comuni (Claude Code e Codex)
│   ├── scripts/                           ← rules.py, pre_write.py, post_edit.py, stop_gate.py, arch_check.py
│   ├── templates/                         ← blocco AGENTS/CLAUDE, config, regole per percorso, CI, agenti e hook Codex, scaffold/<framework>
│   └── install.sh
├── tests/hooks/test_hooks.py              ← ogni regola con l'esito atteso, payload Claude Code e Codex, installer
└── docs/
```

## Verifica

```bash
bash tests/run.sh                         # hook, regole, installer
bash tests/run.sh --scaffolds             # + ogni scaffold: install, lint, typecheck, test, build, arch_check --strict
bash tests/run.sh --scaffolds "react vue" # solo alcuni framework
```

## Aggiungere una regola

1. Aggiungi il default in `DEFAULT_RULES` e il controllo in `rules.py` (riga per riga in `_line_rules`, oppure in `check_imports`/`check_layout`).
2. Aggiungi almeno un caso `deny` e un caso `allow` in `tests/hooks/test_hooks.py`.
3. Documentala in `docs/controlli.md` e, se cambia il modo di scrivere codice, nella skill.
4. Verifica che gli scaffold restino a zero violazioni: `bash tests/run.sh --scaffolds`.

## Aggiornare uno scaffold

Gli scaffold sono progetti completi in `plugins/kyfes/templates/scaffold/<framework>/` (senza `node_modules` né lockfile). Ogni modifica deve lasciare verdi lint, typecheck, test, build e `arch_check --strict`, e va riflessa in `skills/kyfes-architecture/references/<framework>.md`.
