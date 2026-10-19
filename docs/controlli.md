# Controlli automatici

kyfes applica le regole in tre momenti, con lo stesso motore (`plugins/kyfes/scripts/rules.py`, solo libreria standard Python).

| Momento | Script | Claude Code | Codex |
|---|---|---|---|
| prima di ogni scrittura | `pre_write.py` | `PreToolUse` su `Write\|Edit\|MultiEdit` | `PreToolUse` su `apply_patch` |
| dopo ogni scrittura | `post_edit.py` (avvisi all'agente) | `PostToolUse` | `PostToolUse` |
| prima di chiudere | `stop_gate.py` (`arch_check` + comandi) | `Stop`, `SubagentStop` | `Stop` |
| in CI | `arch_check.py --strict` + audit, lint, typecheck, test, build | — | — |

Senza `.kyfes/config.json` ogni hook non fa nulla: il plugin si può tenere installato anche in progetti che non lo usano.

## Regole

| Regola | Default | Cosa rifiuta | Come correggere |
|---|---|---|---|
| `protected-files` | block | `.kyfes/**`, cartelle `generated/`, output di Paraglide | modifica la sorgente o chiedi all'utente |
| `token-storage` | block | token/credenziali in `localStorage`/`sessionStorage` | sessione nel cookie HttpOnly (BFF) |
| `js-cookie-write` | block | `document.cookie = …` | cookie impostati dal server |
| `bearer-in-client` | block | header `Authorization: Bearer` costruiti nel browser | cookie di sessione; l'inoltro del token lo fa il server |
| `insecure-url` | block | `http://`, `ws://` (salvo localhost) | `https://`, `wss://`, URL relativi |
| `raw-html` | block | HTML grezzo senza `sanitizeHtml` | testo, o `sanitizeHtml()` sulla stessa riga |
| `eval` | block | `eval`, `new Function`, timer con stringa | funzioni |
| `blank-target` | block | `target="_blank"` senza `noopener` | `rel="noopener noreferrer"` |
| `secrets` | block | chiavi e password in chiaro | nessun segreto nel frontend |
| `public-env-secret` | block | `VITE_…SECRET`, `NEXT_PUBLIC_…TOKEN`, … | il valore resta sul server |
| `http-outside-api` | block | `fetch`/XHR fuori da `shared/api` | funzione in `features/<f>/api` + TanStack Query |
| `library-boundary` | block | librerie importate fuori dalla loro cartella | ri-esportazione da `shared/*` |
| `layer-direction` | block | import contro `app → pages → features → shared` | sposta il codice al livello giusto |
| `feature-deep-import` | block | import nei file interni di un'altra feature | `index.ts` della feature o `shared` |
| `role-string-check` | block | `role === '…'`, `roles.includes('…')`, `isAdmin`, `hasRole()` | `can(azione, soggetto)` |
| `folder-layout` | block | sottocartelle non previste in `shared` o nelle feature, nomi non kebab-case, feature senza `index.ts` | struttura canonica |
| `duplicates` | block | blocchi di 8+ righe uguali | estrai in `api/`, `shared/lib`, `shared/ui` |
| `hardcoded-text` | warn | testo visibile non tradotto | chiave i18n |
| `console` | warn | `console.log/debug/trace` | rimuovi o usa un logger |
| `explicit-any` | warn | `any` | `z.infer`, `unknown` + parse |
| `ts-ignore` | warn | `@ts-ignore`, `@ts-nocheck` | correggi il tipo |

Test, mock (`src/mocks`), storie e e2e sono esenti dalle regole di struttura e di stile, ma non da quelle sui segreti. Il codice server di Next.js e SvelteKit (`server_globs`) può usare `fetch` e inoltrare credenziali.

## Stop gate

Prima che l'agente (o un sottoagente) chiuda il lavoro, `stop_gate.py` esegue `arch_check` e i comandi `stop_gate.commands` (di default `lint`, `typecheck`, `test`). Se qualcosa fallisce, la chiusura è rifiutata con il dettaglio degli errori. Dopo `max_blocks` rifiuti consecutivi lascia chiudere con un avviso esplicito, per non bloccare la sessione all'infinito. Con `only_if_changes` (default) non fa nulla se `git status` è pulito.

## Da terminale

```bash
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py .            # bloccanti → exit 1
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py . --strict   # anche gli avvisi
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py . --json
```

Con `KYFES_HOOK_DEBUG=1` gli hook salvano il payload ricevuto in `$TMPDIR/kyfes-hook-*.json`.
