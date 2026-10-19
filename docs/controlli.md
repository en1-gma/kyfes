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
| `constant-reuse` | block | più del 10% dei valori letterali di dominio scritto più di una volta (vedi [sotto](#riuso-delle-costanti)) | costante, enum o mappa nel modulo che possiede il valore, poi referenziata |
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

## Riuso delle costanti

Azioni e soggetti RBAC, nomi dei campi, namespace i18n, stati, filtri, ordinamenti, colonne, rotte, endpoint e mapping
si definiscono **una volta** e si referenziano ovunque. La regola `constant-reuse` lo misura sul progetto intero
(`arch_check`, quindi stop gate e CI):

- **Valori contati**: i letterali stringa del codice non di test (`*.test.*`, `mocks/`, `e2e/`… esclusi) che hanno la
  forma di un identificatore: almeno 2 caratteri, almeno una lettera, nessuno spazio, niente markup.
- **Esclusi** perché non sono valori di dominio: specificatori di import/export, argomenti di `t()`/`$t()`/`translate`/
  `m.*()`, attributi di presentazione (`className`, `class`, `type`, `variant`, `role`, `id`, `key`, `aria-*`,
  `data-*`, `size`, `style`… e `providedIn`), i nomi di tipo dopo `typeof x ===`, le direttive `'use client'`/
  `'use server'`, `declare module '…'`, i valori in `constant_reuse.ignore_values`.
- **Duplicato**: un valore che compare come letterale più di una volta, nello stesso file o in file diversi.
  Il conteggio usa uno scanner di stringhe che segue i template literal anche annidati (le stringhe dentro `${…}`
  contano, il testo del template no) e salta le regex literal. Nei template `.vue`/`.svelte` il valore di un attributo
  legato (`:x`, `v-if`, `v-model`, `@click`, `#slot`, `[x]`, `(click)`, `bind:`, `on:`) è un'espressione: contano solo
  i letterali che contiene (`:kind="'currency'"` → `currency`), non il testo dell'attributo.
- **Omonimi**: la metrica non distingue il significato, quindi lo stesso testo usato per due concetti indipendenti
  (`'/orders'` come rotta UI e come endpoint, `'short'` in due opzioni `Intl`) conta come un duplicato. La soglia del
  10% lascia margine per questi casi; se uno è davvero inevitabile, l'utente può aggiungerlo a `ignore_values`.
- **Metrica**: `valori duplicati / valori distinti`. Oltre `constant_reuse.max_duplicate_ratio` (default `0.10`, la
  soglia è inclusa) la regola blocca e riporta i valori più ripetuti con le posizioni. Sotto `constant_reuse.min_values`
  valori distinti (default `20`) la metrica non è significativa e non viene applicata.

**In scrittura (sviluppi futuri)**: `pre_write` costruisce il registro delle costanti esportate del progetto
(`export const X = 'v'`, oggetti e array `as const` → `X.chiave`/`X[i]`, `export enum`) e rifiuta una modifica che
introduce un letterale già definito come costante altrove, o una nuova costante con lo stesso valore, indicando quale
importare (`'update' esiste già come costante ACTIONS.update (src/shared/rbac/ability.ts:12)`). Valgono solo le costanti che il file può importare
rispettando i livelli: quelle di `shared` da ovunque, quelle di una feature dalla feature stessa e da pagine e app;
la costante di un'altra feature è un omonimo (`'draft'` di due stati diversi), non un riuso, e resta conteggiata solo
dalla metrica. Contano solo i letterali introdotti dalla modifica: quelli già presenti nel file non bloccano, i test e i mock sono esclusi, e
`ignore_values` vale anche qui.

`arch_check` stampa sempre la misura (`kyfes: riuso costanti — 4 valori duplicati su 98 (4.1%, soglia 10%)`), anche
quando la soglia è rispettata; con `--json` la trovi in `metrics.constant_reuse`. Dopo ogni scrittura `post_edit`
segnala all'agente i valori del file appena scritto che esistono già altrove, con le posizioni, prima che lo stop gate
blocchi.

Dove vivono le costanti: azioni in `shared/rbac`, soggetto e campi nel `permissions.ts` della feature, namespace in
`shared/i18n` (`COMMON_NS`) e nella feature, stati/ordinamenti/filtri/colonne nel suo `model/`, percorsi UI in
`routes.ts`, endpoint nel suo `api/`, query key nella key factory. Le mappe (stato → variante, colonna → etichetta)
sono `Record<…>` tipizzati, non `switch` con letterali ripetuti.

## Da terminale

```bash
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py .            # bloccanti → exit 1
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py . --strict   # anche gli avvisi
python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py . --json     # {"findings": [...], "metrics": {"constant_reuse": {...}}}
```

Con `KYFES_HOOK_DEBUG=1` gli hook salvano il payload ricevuto in `$TMPDIR/kyfes-hook-*.json`.
