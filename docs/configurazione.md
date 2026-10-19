# Configurazione: `.kyfes/config.json`

Creato dall'installer, protetto dagli hook: lo modifica solo l'utente.

```json
{
  "framework": "react",
  "src_root": "src",
  "rules": { "hardcoded-text": "block", "console": "off" },
  "stop_gate": {
    "enabled": true,
    "only_if_changes": true,
    "max_blocks": 3,
    "commands": ["npm run lint", "npm run typecheck", "npm run test"]
  },
  "duplicates": { "min_lines": 8 }
}
```

| Chiave | Default | Significato |
|---|---|---|
| `framework` | — | `react`, `next`, `vue`, `angular`, `svelte`: sceglie il preset di cartelle, alias e codice server |
| `src_root` | `src` | radice scansionata da `arch_check` |
| `layers` | dal preset | sovrascrive i percorsi `app`, `pages`, `features`, `shared` |
| `aliases` | dal preset | alias di import (`@/` → `src/`, `$lib/` → `src/lib/`, …) |
| `server_globs` | dal preset | file server (Next/SvelteKit/Angular SSR) esenti dalle regole solo-browser |
| `shared_dirs` | 8 cartelle | sottocartelle ammesse in `shared` |
| `rules` | vedi [controlli](controlli.md) | `block`, `warn` oppure `off` per ogni regola |
| `exclude` | build, `node_modules`, `generated` | glob esclusi dalla scansione |
| `stop_gate.*` | vedi sopra | comandi e comportamento del controllo finale |
| `duplicates.min_lines` | `8` | righe significative uguali che contano come duplicato |
