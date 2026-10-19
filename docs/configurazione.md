# Configurazione: `.kyfes/config.json`

Creato dall'installer, protetto dagli hook (scritture, `apply_patch` e comandi shell, con qualunque combinazione di maiuscole nel percorso) e, in Claude Code, dalle regole `permissions.deny` che l'installer aggiunge a `.claude/settings.json`: lo modifica solo l'utente.

In un monorepo ogni progetto ha la sua `.kyfes/config.json`: gli hook usano quella più vicina al file scritto.

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
  "duplicates": { "min_lines": 8 },
  "constant_reuse": { "max_duplicate_ratio": 0.10, "min_values": 20, "ignore_values": [] }
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
| `stop_gate.enabled` | `true` | attiva il controllo finale |
| `stop_gate.only_if_changes` | `true` | salta il controllo solo se `git status` è pulito e `HEAD` non è cambiato dall'inizio della sessione (senza baseline: nessun commit non pubblicato) |
| `stop_gate.max_blocks` | `3` | blocchi di fila nella stessa catena di stop, poi chiusura consentita con avviso "NON è conforme" |
| `stop_gate.commands` | `[]` (l'installer scrive lint, typecheck, test) | comandi eseguiti nella radice del progetto |
| `duplicates.min_lines` | `8` | righe significative uguali che contano come duplicato |
| `constant_reuse.max_duplicate_ratio` | `0.10` | quota massima di valori letterali di dominio duplicati (vedi [controlli](controlli.md#riuso-delle-costanti)) |
| `constant_reuse.min_values` | `20` | sotto questo numero di valori distinti la metrica non si applica |
| `constant_reuse.ignore_values` | `[]` | valori esclusi dal conteggio (da usare per veri falsi positivi, non per rientrare nella soglia) |
| `allowed_http_hosts` | `[]` | host ammessi in URL `http://`/`ws://` (es. un BFF interno in sviluppo); il confronto è sull'host esatto |
