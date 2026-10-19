# kyfes in Codex

Codex legge gli stessi file di Claude Code dove il formato è comune, e file propri dove non lo è.

| Elemento | Dove | Note |
|---|---|---|
| Plugin | `plugins/kyfes/.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json` | `codex plugin marketplace add en1-gma/kyfes`, poi `codex plugin add kyfes@kyfes` |
| Skill | `plugins/kyfes/skills/*` (dal plugin) o `.agents/skills/kyfes-*` (nel progetto) | `$kyfes-architecture`, `$kyfes-plan`, `$kyfes-review`, `$kyfes-init` |
| Istruzioni | blocco gestito in `AGENTS.md` | lo stesso testo del blocco in `CLAUDE.md` |
| Agenti | `.codex/agents/kyfes_architect.toml`, `kyfes_implementer.toml`, `kyfes_reviewer.toml` | equivalenti di `kyfes:architect`, `kyfes:implementer`, `kyfes:reviewer` |
| Hook | `plugins/kyfes/hooks/hooks.json` (plugin) o `.codex/hooks.json` (progetto) | stessi script; `apply_patch` viene analizzato file per file |

L'installer scrive sempre i file di progetto (`AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/hooks.json`) che puntano alla copia versionata del kit in `tools/kyfes/`: chi clona il repository ha regole, agenti e controlli senza installare nulla.

## Fiducia

Codex carica configurazione e hook di progetto solo se il progetto è *trusted*, e chiede di rivedere gli hook nuovi o modificati prima di eseguirli. Le skill si caricano comunque. Alla prima apertura: rendi trusted il progetto e approva gli hook `kyfes`.

## Differenze rispetto a Claude Code

- Codex modifica i file con `apply_patch`: l'hook estrae le righe aggiunte di ogni file della patch e applica le stesse regole.
- Se un agente scrive file da shell (es. `cat > file`), l'hook di scrittura non lo vede: lo stop gate e la CI eseguono comunque `arch_check` sull'intero progetto.
- Le regole per percorso di Claude Code (`.claude/rules/kyfes/*.md`) non hanno un equivalente diretto: in Codex il contenuto è nella skill e in `AGENTS.md`.
