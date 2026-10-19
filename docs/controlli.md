# Controlli automatici

kyfes applica le regole in tre momenti, con lo stesso motore (`plugins/kyfes/scripts/rules.py`, solo libreria standard Python).

| Momento | Script | Claude Code | Codex |
|---|---|---|---|
| inizio sessione | `session_start.py` (registra `HEAD` come baseline della sessione) | `SessionStart` | `SessionStart` |
| prima di ogni scrittura | `pre_write.py` | `PreToolUse` su `Write\|Edit\|MultiEdit\|NotebookEdit` | `PreToolUse` su `apply_patch` |
| prima di ogni comando shell | `bash_guard.py` | `PreToolUse` su `Bash` | `PreToolUse` su `Bash\|shell\|exec_command\|local_shell` |
| dopo ogni scrittura | `post_edit.py` (avvisi all'agente) | `PostToolUse` | `PostToolUse` |
| prima di chiudere | `stop_gate.py` (`arch_check` + comandi) | `Stop`, `SubagentStop` | `Stop` |
| in CI | `arch_check.py --strict` + audit, lint, typecheck, test, build | — | — |

Senza `.kyfes/config.json` ogni hook non fa nulla: il plugin si può tenere installato anche in progetti che non lo usano. Il progetto si cerca partendo dal file scritto (la `.kyfes/config.json` più vicina), non dal cwd: in un monorepo aperto dalla radice ogni file è controllato con la configurazione del suo progetto, e lo stop gate lanciato dalla radice controlla i progetti kyfes che trova sotto il cwd.

## Cosa valuta `pre_write.py`

- Il file **risultante**, non solo il frammento: per `Write`, `Edit`, `MultiEdit` e `apply_patch` (Update ricostruito applicando gli hunk al file su disco) le regole girano sul contenuto finale. Togliere `sanitizeHtml(...)` o il suo import con un `Edit` viene quindi visto anche se il frammento nuovo è innocuo.
- Solo ciò che la modifica introduce: una violazione già presente prima (stessa regola sulla stessa riga di codice) non blocca un edit non correlato; la segnalano lo stop gate e la CI. Se il file risultante non si può ricostruire (contesto dell'hunk non trovato), si valutano i frammenti scritti.
- `apply_patch`: anche `Delete File` e `Move to` di un file protetto sono negati.
- Percorsi canonici: su filesystem case-insensitive (macOS, Windows) `.Kyfes/config.json` o `src/Features/...` vengono riportati al nome reale su disco prima di applicare le regole; i file protetti si confrontano comunque senza distinzione di maiuscole.
- Commenti: prima dei controlli vengono sostituiti con spazi da un piccolo tokenizer che rispetta stringhe, template e regex. Un commento non nasconde il codice che lo segue sulla stessa riga (`/**/ eval(x)`), e un `/*` dentro una stringa (`import.meta.glob('./locales/*.json')`) non apre un commento.

## Regole

| Regola | Default | Cosa rifiuta | Come correggere |
|---|---|---|---|
| `protected-files` | block | `.kyfes/`, `tools/kyfes/`, `.codex/hooks.json`, `.codex/config.toml`, `.codex/agents/kyfes_*`, `.claude/settings.json` e `.claude/settings.local.json` (`disableAllHooks` spegnerebbe gli hook), `.claude/rules/kyfes/`, `.agents/skills/kyfes-*`, `.github/workflows/kyfes-check.yml`, cartelle `generated/`, output di Paraglide | modifica la sorgente o chiedi all'utente |
| `token-storage` | block | token/credenziali in `localStorage`/`sessionStorage`: `setItem`/`getItem` anche su più righe, proprietà (`localStorage.token =`, `sessionStorage['x']`); la chiave è sensibile se una delle sue parole (camelCase, snake_case, kebab-case) è `token`, `jwt`, `session`, `auth`, `password`, `secret`, … (quindi non `accessibility-mode` o `author-filter`) | sessione nel cookie HttpOnly (BFF) |
| `js-cookie-write` | block | `document.cookie = …`, `document['cookie'] = …`, `cookieStore.set/delete` | cookie impostati dal server |
| `bearer-in-client` | block | qualsiasi assegnazione dell'header `Authorization` (oggetto, `headers['Authorization'] =`, `.set`/`.append`) e stringhe che iniziano con `Bearer `, `Basic `, `Token ` | cookie di sessione; l'inoltro del token lo fa il server |
| `insecure-url` | block | `http://`, `ws://`, salvo `localhost`/`127.0.0.1`/`[::1]` con confine di host (`localhost.evil.com` è rifiutato), namespace XML noti e domini riservati RFC 2606/6761 (`*.example.com/.org/.net`, `.test`, `.invalid`, `.example`, `.localhost`) | `https://`, `wss://`, URL relativi |
| `raw-html` | block | HTML grezzo (anche `createContextualFragment`, `.srcdoc =`) senza `sanitizeHtml` | testo, o `sanitizeHtml()` sulla stessa riga, importato da `shared/lib` e non ridefinito nel file |
| `eval` | block | `eval` (anche `window.eval`, `['eval']`), `Function(…)` con o senza `new`, timer con stringa | funzioni |
| `blank-target` | block | `target="_blank"` senza `noopener` | `rel="noopener noreferrer"` |
| `secrets` | block | chiavi e password in chiaro; nei `.env` anche valori senza virgolette (`CLIENT_SECRET=…`). Ignorati i valori che sono chiavi i18n (`validation.required`) o segnaposto (`changeme`, `<…>`, `${…}`), e i file `.env.example/.sample/.template` per i valori senza formato riconoscibile | nessun segreto nel frontend |
| `public-env-secret` | block | `VITE_…SECRET`, `NEXT_PUBLIC_…TOKEN`, … | il valore resta sul server |
| `http-outside-api` | block | fuori da `shared/api`: `fetch` (anche `window.`/`globalThis.`/`self.fetch`, `['fetch'](`, `fetch` passato come valore o con `bind`/`call`), XHR, `navigator.sendBeacon`, `new WebSocket`, `new EventSource`, `$.ajax` | funzione in `features/<f>/api` + TanStack Query |
| `library-boundary` | block | librerie importate fuori dalla loro cartella (elenco in [architettura](architettura.md#confini-delle-librerie)); librerie di cookie lato client ovunque | ri-esportazione da `shared/*` |
| `dynamic-import` | block | `import()`/`require()` con un nome calcolato (i confini non si possono verificare); ammessi letterali e template locali (`./locales/${l}.json`) | import letterale |
| `layer-direction` | block | import contro `app → pages → features → shared` | sposta il codice al livello giusto |
| `feature-deep-import` | block | import nei file interni di un'altra feature | `index.ts` della feature o `shared` |
| `role-string-check` | block | `role === '…'` (anche invertito, `'admin' === role`), `roles.includes('…')`, `['admin'].includes(role)`, `switch (role)`, `role.startsWith(…)`, `isAdmin`, `hasRole()` | `can(azione, soggetto)` |
| `folder-layout` | block | sottocartelle non previste in `shared` o nelle feature, nomi non kebab-case, feature senza `index.ts` | struttura canonica |
| `duplicates` | block | blocchi di 8+ righe uguali | estrai in `api/`, `shared/lib`, `shared/ui` |
| `hardcoded-text` | warn | testo visibile non tradotto | chiave i18n |
| `console` | warn | `console.log/debug/trace` | rimuovi o usa un logger |
| `explicit-any` | warn | `any` | `z.infer`, `unknown` + parse |
| `ts-ignore` | warn | `@ts-ignore`, `@ts-nocheck` | correggi il tipo |

Test, mock (`src/mocks`), storie e e2e sono esenti dalle regole di struttura e di stile, ma non da quelle sui segreti (`secrets`, `public-env-secret`, `insecure-url`). Gli import con backtick (`` import(`…`) ``) sono analizzati come gli altri. Il codice server di Next.js e SvelteKit (`server_globs`) può usare `fetch` e inoltrare credenziali.

## Comandi shell (`bash_guard.py`)

Le scritture via shell non passano da `pre_write.py`, quindi un hook dedicato nega:

- i comandi non di sola lettura che toccano file protetti (`.kyfes/`, `tools/kyfes/`, impostazioni e hook dell'agente, regole, skill e agenti di kyfes, `kyfes-check.yml`) o che citano `disableAllHooks`, `CLAUDE_PROJECT_DIR`, `KYFES_PROJECT_DIR`;
- le scritture nel codice sorgente (sotto `src_root`) e nei `.env`: redirect `>`/`>>`, `tee`, `sed -i`/`perl -i`, `cp`/`mv`/`install`/`ln`/`rsync`/`dd`/`touch` verso quei file, `curl -o`/`wget -O`, `tar`/`unzip` che estraggono lì, `python -c`/`node -e` (e simili) che scrivono file; i percorsi relativi seguono i `cd` del comando;
- `git apply`, `git am`, `patch`;
- `install.sh --force` e `install.sh --uninstall` (li esegue l'utente).

Sono consentiti i comandi di sola lettura (`cat`, `grep`, `ls`, `find` senza `-exec`/`-delete`, `git diff/log/status/show`, …), `git add/commit/push`, l'esecuzione di `arch_check.py`/`stop_gate.py` del kit e di `tools/kyfes/setup.sh`, e i comandi che non scrivono file riconoscibili (formatter, `npm run …`). Il controllo è euristico: la rete finale restano lo stop gate e la CI, che eseguono `arch_check` sull'intero progetto; in Claude Code le regole `permissions.deny` scritte dall'installer sono una barriera in più.

## Stop gate

Prima che l'agente (o un sottoagente) chiuda il lavoro, `stop_gate.py` esegue `arch_check` e i comandi `stop_gate.commands` (di default `lint`, `typecheck`, `test`). Se qualcosa fallisce, la chiusura è rifiutata con il dettaglio degli errori.

- Blocca fino a `max_blocks` volte di fila nella stessa catena di stop, anche mentre l'agente sta continuando per un blocco precedente (`stop_hook_active`); poi lascia chiudere con un avviso esplicito ("il lavoro NON è conforme"), per non bloccare la sessione all'infinito. Una catena nuova riparte da zero.
- Con `only_if_changes` (default) non fa nulla solo se non c'è niente da controllare: `git status` pulito **e** `HEAD` uguale alla baseline registrata a inizio sessione. Senza baseline contano i commit non presenti su nessun remote. Committare quindi non spegne il gate. Fuori da un repository git controlla sempre.
- Lanciato da una cartella che non è un progetto kyfes (radice di un monorepo), controlla i progetti kyfes sotto il cwd e riporta gli errori di ciascuno.

## Da terminale

```bash
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py .            # bloccanti → exit 1
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py . --strict   # anche gli avvisi
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py . --json
```

Con `KYFES_HOOK_DEBUG=1` gli hook salvano il payload ricevuto in `$TMPDIR/kyfes-hook-*.json`.
