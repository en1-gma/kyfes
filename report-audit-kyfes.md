# Report di audit — kyfes

| | |
|---|---|
| **Data** | 19 ottobre 2026 |
| **Oggetto** | plugin kyfes (`plugins/kyfes`): hook, motore delle regole, stop gate, installer e i 5 scaffold |
| **Commit analizzato** | `3ef5307` (branch `main`) |
| **Metodo** | costruzione di un frontend reale con kyfes + batteria di bypass sugli hook + audit degli scaffold con test di prova |
| **Repo modificato** | no (tutte le prove sono in una cartella temporanea) |

---

## 1. Sintesi

kyfes fa bene il suo lavoro quando l'agente "collabora": il frontend costruito da zero ha passato lint, typecheck, 92 test unitari, build, 7 test e2e con axe e `arch_check --strict` senza violazioni, e la regola `duplicates` ha intercettato un vero copia-incolla.

Sotto pressione, però, emergono tre problemi di fondo:

1. **Una vulnerabilità alta (open redirect) è presente in tutti e 5 gli scaffold** e il test che dovrebbe coprirla non la vede.
2. **Le garanzie dello stop gate sono più deboli di quanto promette il README**: blocca al massimo una volta per ciclo, si spegne se l'agente fa commit, e la configurazione "protetta" si aggira.
3. **Gli hook sono regex riga per riga**: 25 dei 29 casi d'attacco provati passano, e 3 casi legittimi vengono bloccati.

| Gravità | Numero |
|---|---|
| Alta | 6 |
| Media | 30+ (di cui 25 bypass degli hook) |
| Bassa | 6 |

---

## 2. Cosa è stato costruito

### 2.1 Setup

```bash
mkdir app && cd app && git init
kyfes/install.sh --framework react --scaffold --no-plugin
npm install
```

L'installer è andato a buon fine: 101 file di scaffold, `.kyfes/config.json`, `tools/kyfes/`, blocchi in `CLAUDE.md`/`AGENTS.md`, `.codex/hooks.json`, workflow CI.

Baseline dello scaffold React: lint ✓, typecheck ✓, 80/80 test ✓, build ✓, `arch_check --strict` ✓, `npm audit --omit=dev` 0 vulnerabilità.

### 2.2 Feature `customers` (anagrafica clienti)

| Area | Contenuto |
|---|---|
| Modello | `model/customers.schema.ts` — Zod per `Customer`, `CustomerInput`, pagina a cursore, statistiche per paese |
| API | `api/customers.api.ts` (risposte validate con Zod), `customers.queries.ts` (key factory, infinite query), `customers.mutations.ts` (create/update, delete ottimistico con rollback) |
| RBAC | soggetto CASL `Customer`; manager `manage`; viewer `read` con regola invertita sul campo `email`; operatore `update` solo su `name`/`email` e solo se `active: true` |
| UI | `CustomersTable` (ricerca, filtro paese, "carica altri", colonna e-mail condizionata al permesso sul campo), `CustomerForm` (campi non scrivibili in sola lettura e mai inviati), `CustomerEditor` (controllo sul record), `CustomersChart` |
| Pagine e rotte | `/customers`, `/customers/new`, `/customers/:id/edit`, ognuna protetta da `RequirePermission` |
| i18n | namespace `customers` in it/en, voce di menu nel namespace `common` |
| Mock | seed di 30 clienti e handler MSW che applicano anche i permessi sui campi |
| Componenti condivisi estratti | `shared/ui/QueryState`, `LoadMore`, `ConfirmDeleteDialog` (resi necessari dalla regola `duplicates`, vedi §6.2) |
| Test | 9 unit test (matrice RBAC, cursore, ricerca, rollback del delete, validazione, invio dei soli campi permessi) e 4 e2e (axe WCAG 2.2 AA, ricerca, creazione, cambio lingua) |

Ogni file è passato dagli hook reali (`pre_write.py` + `post_edit.py`) simulando l'evento `Write` di Claude Code.

### 2.3 Esito finale

| Controllo | Esito |
|---|---|
| `npm run lint` | ✓ |
| `npm run typecheck` | ✓ |
| `npm run test` | ✓ 92/92 |
| `npm run build` | ✓ |
| `npx playwright test` | ✓ 7/7 (con axe) |
| `arch_check.py --strict` | ✓ nessuna violazione |
| `npm audit --omit=dev` | ✓ 0 vulnerabilità |

### 2.4 Gli altri scaffold

Copiati in cartelle temporanee e verificati da due subagent:

| Scaffold | install | lint | typecheck | test | build | arch_check --strict | audit |
|---|---|---|---|---|---|---|---|
| Vue | ✓ | ✓ | ✓ | ✓ 61 | ✓ | ✓ | 0 |
| SvelteKit | ✓ | ✓ | ✓ | ✓ 50 | ✓ | ✓ | 0 |
| Angular | ✓ | ✓ | ✓ | ✓ 51 | ✓ (bundle iniziale 747 kB, budget warning 800 kB) | ✓ | 0 |
| Next.js | ✓ (eslint 9 deprecato) | ✓ | ✓ | ✓ 55 | ✓ | ✓ | 0 |

---

## 3. Finding di gravità alta

### H1 — Open redirect in `safeRedirect` (tutti e 5 gli scaffold)

**Dove:** `shared/lib/safe-redirect.ts` in React, Vue, Angular, Next, SvelteKit.

**Problema:** i controlli (`startsWith('//')`, backslash) girano sull'input grezzo, ma la funzione restituisce `url.pathname` già normalizzato da `new URL`. La normalizzazione dei dot-segment produce un percorso che inizia con `//`, cioè un URL protocol-relative verso un altro host.

**Prova:**

```js
for (const v of ['/.//evil.example', '/a/..//evil.example', '/%2e%2e//evil.example', '/..//evil.example']) {
  const u = new URL(v, 'https://kyfes.invalid');
  console.log(v, '->', u.pathname);   // tutti -> //evil.example
}
```

Poi `window.location.assign('//evil.example')` porta su `https://evil.example`.

**Impatto:** arriva a `login(returnTo)` (il `returnTo` passato al BFF) e a `logout(redirectTo)`. In Next `new URL('//evil.com', origin)` naviga davvero su evil.com. Il test esistente *"normalises dot segments without leaving the origin"* passa perché prova solo `/a/../../orders`.

**Correzione suggerita:** validare il **risultato** dopo la normalizzazione.

```ts
const out = `${url.pathname}${url.search}${url.hash}`;
if (out.startsWith('//') || out.includes('\\')) return fallback;
return out;
```

E aggiungere i 4 casi qui sopra ai test di tutti gli scaffold.

### H2 — Configurazione protetta aggirabile su filesystem case-insensitive

**Dove:** `scripts/rules.py`, `check_protected()` e `rel_to_project()`.

**Problema:** il confronto è sensibile alle maiuscole (`rel.startswith(".kyfes/")`), ma su macOS (APFS) e Windows `.Kyfes/config.json` e `.kyfes/config.json` sono lo stesso file. `Path.resolve()` non canonicalizza le maiuscole.

**Prova:**

```text
Edit .kyfes/config.json  → deny
Edit .Kyfes/config.json  → consentito (sovrascrive la config reale)
```

Una volta scritta la config, l'agente può mettere ogni regola a `"off"` e disattivare lo stop gate.

Lo stesso vale per i livelli: `src/Features/customers/components/X.tsx` che importa da `@/pages/...` non viene bloccato in pre-write, perché `layer_of()` non riconosce `Features`. Qui `arch_check` a fine lavoro lo intercetta, perché legge i nomi reali su disco; per la config no.

**Correzione suggerita:** normalizzare con `os.path.normcase` e, se il path esiste, usare il nome reale su disco (ad esempio confrontando `os.path.samefile` con `proj / CONFIG_REL`).

### H3 — Lo stop gate blocca al massimo una volta

**Dove:** `scripts/stop_gate.py`

```python
if event.get("stop_hook_active") is True:
    return 0
```

**Problema:** in Claude Code `stop_hook_active` è `true` proprio quando l'agente sta continuando *a causa* di un blocco dello stop hook. Quindi:

1. primo stop → controlli falliti → `block`;
2. l'agente prova a correggere e si ferma di nuovo → `stop_hook_active=true` → **chiusura consentita anche se i controlli falliscono ancora**.

**Prova:**

```text
3a) stop, stop_hook_active=false, con violazione → {"decision":"block", ...}
3b) stop, stop_hook_active=true, stessa violazione → nessun output (consentito)
```

**Conseguenze:**
- `max_blocks` (3) in Claude Code non viene mai raggiunto, perché il contatore sale di 1 per ciclo e non per tentativo;
- il contatore resta in `$TMPDIR` e si accumula tra i turni della stessa sessione;
- contraddice il README: *"Stop gate: … otherwise the agent cannot finish"*.

**Correzione suggerita:** non uscire su `stop_hook_active`; affidare l'anti-loop solo al contatore `max_blocks` (che esiste già per questo), azzerandolo quando i controlli passano.

### H4 — Lo stop gate si spegne se l'agente fa commit

**Dove:** `stop_gate.py`, `has_changes()` con `only_if_changes: true` (default).

**Problema:** il gate gira solo se `git status --porcelain` non è vuoto. Se l'agente committa il lavoro prima di fermarsi, il gate viene saltato anche con violazioni bloccanti.

**Prova:**

```text
4) stop dopo commit con Bad.tsx che importa axios in una feature → consentito
   arch_check.py sullo stesso albero → [library-boundary] ... Bad.tsx:1
```

**Correzione suggerita:** confrontare con il commit di inizio sessione (salvato al primo evento della sessione) oppure con `git merge-base HEAD origin/main`, non con lo stato del working tree.

### H5 — Gli hook coprono solo Write/Edit/MultiEdit/apply_patch

**Dove:** `hooks/hooks.json` (`"matcher": "Write|Edit|MultiEdit|apply_patch"`) e `templates/codex-hooks.json`.

**Problema:** un agente può scrivere qualsiasi file con Bash (`cat > file <<EOF`, `sed -i`, `python -c`, `cp`) senza passare da nessun controllo, compresa la configurazione "protetta" `.kyfes/config.json`. Anche `NotebookEdit` è escluso. Lo stop gate resta l'unica rete, ma è aggirabile (H3, H4) e la config che lo governa è modificabile via Bash.

**Correzione suggerita:**
- un `PreToolUse` su `Bash` che neghi i comandi che scrivono in `.kyfes/` o sotto `src_root` (euristica su redirect `>`, `tee`, `sed -i`, `cp`, `mv`);
- in alternativa rendere la config immutabile per l'agente con `permissions.deny` nelle impostazioni di progetto;
- documentare il limite nel README.

### H6 — Next: richieste infinite su 403 di `/auth/me`

**Dove:** scaffold Next — `query-client.ts` (onError della QueryCache) → `providers.tsx` (onForbidden) → `invalidateSession`.

**Problema:** un 403 su `/auth/me` invalida la sessione, che rifà `/auth/me`, che risponde di nuovo 403, senza fine.

**Prova:** test del subagent con mock limitato a 51 risposte: il limite viene raggiunto. Senza limite il test resta appeso perché il ciclo satura i timer.

Angular ha la stessa catena ma non va in loop: l'invalidazione avviene mentre la richiesta è in corso e viene deduplicata (verificato).

**Correzione suggerita:** non chiamare `onForbidden` per le richieste di sessione (`/auth/*`), oppure non invalidare se il 403 viene dalla query di sessione stessa.

---

## 4. Finding di gravità media — hook e regole

### 4.1 Batteria di bypass

Ogni caso è un evento `Write` reale inviato a `pre_write.py` su `src/features/customers/components/X.tsx` (o sul file indicato). Riproducibile con lo script in appendice A.

| # | Contenuto scritto | Atteso | Ottenuto | Regola aggirata |
|---|---|---|---|---|
| 1 | `localStorage.setItem('token', t)` | deny | **deny** ✓ | (controllo positivo) |
| 2 | `localStorage.token = jwt` | deny | allow | token-storage |
| 3 | `/**/ localStorage.setItem('token', t)` | deny | allow | **tutte**: una riga che inizia con `/*` viene saltata |
| 4 | `localStorage.setItem(\n  'access_token', t)` | deny | allow | token-storage (regex su una sola riga) |
| 5 | `document['cookie'] = 'session=' + s` | deny | allow | js-cookie-write |
| 6 | `window.fetch('/api/orders')` | deny | allow | http-outside-api (`(?<![\w.])fetch`) |
| 7 | `globalThis.fetch('/api/orders')` | deny | allow | http-outside-api |
| 8 | `import ky from 'ky'; ky.get(...)` | deny | allow | http-outside-api / library-boundary |
| 9 | `navigator.sendBeacon('/api/track', d)` | deny | allow | http-outside-api |
| 10 | `new WebSocket('wss://…')` | deny | allow | http-outside-api |
| 11 | `window.eval(code)` | deny | allow | eval |
| 12 | `Function('return 1')` (senza `new`) | deny | allow | eval |
| 13 | `headers.Authorization = token` | deny | allow | bearer-in-client |
| 14 | ``Authorization: `Basic ${btoa(u)}` `` | deny | allow | bearer-in-client |
| 15 | `switch (user.role) { case 'admin': … }` | deny | allow | role-string-check |
| 16 | `['admin'].includes(user.role)` | deny | allow | role-string-check |
| 17 | `'http://localhost.evil.com/x'` | deny | allow | insecure-url (lookahead senza confine di host) |
| 18 | `'http://example.com.evil.net/x'` | deny | allow | insecure-url |
| 19 | `const sanitizeHtml = s` (identità) + `dangerouslySetInnerHTML={{ __html: sanitizeHtml(x) }}` | deny | allow | raw-html (eccezione solo testuale) |
| 20 | `dangerouslySetInnerHTML={{ __html: x }} /> {/* sanitizeHtml( */}` | deny | allow | raw-html |
| 21 | `import { useQuery } from '@tanstack/react-query'` | deny | **deny** ✓ | (controllo positivo) |
| 22 | ``await import(`@tanstack/react-query`)`` | deny | allow | library-boundary (regex solo con `'`/`"`) |
| 23 | `import ReactECharts from 'echarts-for-react'` | deny | allow | library-boundary (lista chiusa) |
| 24 | `import useSWR from 'swr'` | deny | allow | library-boundary |
| 25 | path `src/Features/…` + import axios | deny | **deny** ✓ | (axios è vietato ovunque fuori da shared/api) |
| 26 | path `.KYFES/config.json` | deny | allow | protected-files (vedi H2) |
| 27 | path `src/shared/../features/…` + import axios | deny | **deny** ✓ | (`resolve()` gestisce `..`) |
| 28 | `.env`: `CLIENT_SECRET=abcdef1234567890` | deny | allow | secrets (la regex richiede le virgolette) |
| 29 | `.env`: `DB_PASSWORD=hunter2hunter2` | deny | allow | secrets |

**Risultato: 25 bypass su 29 casi d'attacco** (i 4 ✓ sono i controlli positivi). Il README dichiara *"secrets in code or `.env`"*, ma nei `.env` i valori di solito non sono quotati, quindi i casi 28–29 smentiscono direttamente la documentazione.

### 4.2 Falsi positivi

| Contenuto | Atteso | Ottenuto | Causa |
|---|---|---|---|
| `localStorage.setItem('accessibility-mode', 'high')` | allow | **deny** | `access` cercato come sottostringa |
| `localStorage.setItem('author-filter', v)` | allow | **deny** | `auth` dentro `author` |
| `const m = { password: 'validation.required' }` | allow | **deny** | la regola `secrets` scambia una chiave i18n per una password |
| `const isAdminSectionVisible = can('read', 'Admin')` | allow | allow ✓ | — |

Le regole hanno anche falsi positivi e falsi negativi sulle stesse parole chiave, quindi conviene ancorarle a confini di parola (`\b(access|refresh)_?token\b`, `\bauth(entication)?\b`).

### 4.3 Altri limiti strutturali degli hook

| # | Problema | Prova |
|---|---|---|
| M1 | **Monorepo / cartella di lavoro senza config:** `find_project_dir` parte dal `cwd` dell'evento, non dal file scritto. Se la sessione è aperta nella radice di un monorepo e kyfes è in `apps/web/`, nessun controllo viene eseguito. | `cwd` = cartella padre, scrittura di `localStorage.setItem("token", t)` → consentita |
| M2 | **Edit valutato solo sul frammento:** `pre_write` controlla `new_string`, non il file risultante. Togliere `sanitizeHtml(h)` da una riga con `dangerouslySetInnerHTML` passa; il problema emerge solo come avviso di `post_edit` e poi allo stop gate. | Edit `sanitizeHtml(h)` → `h` → consentito |
| M3 | `COMMENT_LINE` salta l'intera riga se inizia con `//`, `/*`, `*` o `<!--`, anche quando dopo il commento c'è codice (caso 3). | — |
| M4 | La lista delle librerie in `LIBRARY_BOUNDARIES` è chiusa: ogni wrapper (`echarts-for-react`, `react-chartjs-2`, `@nivo/*`), client HTTP (`ky`, `ofetch`, `superagent`) o libreria di server state (`swr`, `@apollo/client`) la aggira. | casi 8, 23, 24 |

**Correzione suggerita:** in `pre_write`, per `Edit`/`MultiEdit`, applicare la modifica al contenuto attuale del file e controllare il file risultante; per il project dir, partire dal `file_path` scritto e risalire alla `.kyfes/config.json` più vicina.

---

## 5. Finding di gravità media — scaffold

### 5.1 Permessi a livello di campo violati in creazione e modifica

**React — confermato.** `features/orders/components/OrderForm.tsx`: in creazione, se l'utente non può scrivere `status`, il campo è in sola lettura, ma il body è costruito con `{ ...values, ...payload }` e quindi `status` viene inviato comunque.

```text
operatore (create Order solo su customerName, total)
POST /api/orders  body: {"customerName":"Op S.r.l.","status":"draft","total":0}
```

**SvelteKit — confermato.** `OrderForm.svelte` + `orders.api.ts` usano una PUT completa: `status` viene inviato anche se è in sola lettura.

**Impatto:** un backend che applica i permessi per campo (`permittedFieldsOf` di CASL) risponde 403 a richieste che l'interfaccia presenta come lecite. In creazione conviene omettere i campi non scrivibili e lasciare che sia il server ad applicare il default.

### 5.2 La rotta di modifica controlla solo il tipo, non il record

| Scaffold | Stato |
|---|---|
| React | ✓ corretto: `OrderDetail` usa `<Can I="update" this={orderSubject(order)} passThrough>` e mostra `ForbiddenState` |
| Vue | ✗ confermato con un test: il manager apre `/orders/<id spedito>/edit` e ottiene il form modificabile; il 403 arriva solo dal server |
| Angular | ✗ per ispezione (`app.routes.ts`, `order-form.component.ts` controlla solo il campo `status`) |
| Next | ✗ per ispezione (`OrderEditGuard.tsx`, `OrderEditor.tsx`: `canEditOrder(order)` non viene mai chiamato) |
| SvelteKit | ✗ per ispezione (`routes/orders/[id]/edit/+page.ts`) |

### 5.3 Il refresh su 401 non è davvero single-flight

In tutti gli scaffold la promessa del refresh in corso viene azzerata nel `finally`: un 401 che arriva *dopo* la fine del refresh, per una richiesta partita prima, ne avvia un secondo.

- Confermato con test in Vue, SvelteKit e Next (`refreshCalls = 2`).
- Angular e React hanno lo stesso schema nel codice (`refreshInFlight = null` in `finally`/`finalize`).

**Impatto:** con refresh token a rotazione e rilevamento del riuso, il secondo refresh fallisce e l'utente viene disconnesso.

**Correzione suggerita:** ricordare l'istante dell'ultimo refresh riuscito e ripetere senza nuovo refresh le richieste partite prima di quell'istante.

### 5.4 Divergenze dal contratto tra gli scaffold

| Scaffold | Divergenza | Stato |
|---|---|---|
| Next | `api-error.ts`: `fieldErrors` è `Record<string, string>`, mentre `docs/dati.md` e gli altri 4 usano `string[]`. Con il formato corretto il `safeParse` di tutto il body fallisce: `code` diventa `HTTP_422`, `message` e `correlationId` si perdono. | confermato |
| Next | `/orders/stats` ha la forma `{items:[…]}`, gli altri 4 usano `{months:[…]}`: lo stesso backend non può servire tutti gli scaffold | ispezione |
| Next | `/auth/me` è escluso dal refresh: ricaricando la pagina con l'accesso scaduto e il refresh valido si finisce al login completo | confermato |
| Next, Vue | il 403 viene mostrato come errore generico, non come "non autorizzato" come chiede `docs/rbac.md` | confermato |
| Angular | refresh disattivato di default (`provideApi()` con `refreshSession: false`); in Next è attivo | ispezione |

### 5.5 Robustezza della sessione

| Scaffold | Problema | Stato |
|---|---|---|
| Vue | `session.schema.ts`: `locale: z.enum(SUPPORTED_LOCALES).optional()`. Con `locale: 'de'`, `null` o `'en-US'` fallisce tutta la sessione; `router.isReady()` va in errore e l'app non viene montata (pagina bianca, senza stato di errore). Stesso effetto con un 5xx su `/auth/me` al primo caricamento. | confermato |
| SvelteKit | `rules.schema.ts`: una regola con soggetto o azione sconosciuti (`{read, Invoice}`, `{export, Order}`) invalida l'intera sessione. Va contro *"regole calcolate dal server"* e contro React e Vue, dove le regole sconosciute semplicemente non fanno match. | confermato |

### 5.6 Gestione degli errori

| Scaffold | Problema | Stato |
|---|---|---|
| SvelteKit | `OrderForm.svelte`: `await mutateAsync` senza try/catch, quindi ogni errore del server diventa una unhandled rejection; i `fieldErrors` del 422 vengono ignorati | confermato |
| SvelteKit | `enableSessionRefresh` non viene mai chiamato nell'app (solo nei test): il refresh documentato è spento | ispezione |
| SvelteKit | un 401 sul refresh stesso chiama `unauthorizedHandler` due volte; `/auth/login` e `/auth/logout` non sono esclusi dalla logica di refresh | confermato |
| React | `shared/api/http.ts`, `toApiError`: una richiesta annullata (`CanceledError`, `ERR_CANCELED`) diventa `ApiError` con codice `NETWORK_ERROR`, cioè "server non raggiungibile" | confermato (vedi sotto) |
| Next | gli `*.api.ts` usano `Schema.parse`, che lancia `ZodError` e non `ApiError`: `shouldRetry` ripete 2 volte anche su payload non validi, e l'errore esce senza `correlationId` | ispezione |

Prova per React:

```text
toApiError(new axios.CanceledError())                 → code NETWORK_ERROR, status 0
http.get('/customers', { signal }) + abort()           → ApiError NETWORK_ERROR (cause ERR_CANCELED)
```

TanStack Query scarta da solo le proprie cancellazioni, ma qualsiasi uso manuale di `AbortController` mostra all'utente un falso "server non raggiungibile". Correzione: `if (axios.isCancel(error)) throw error;` prima della normalizzazione.

---

## 6. Problemi emersi costruendo la feature

### 6.1 La cache di Vitest 5 tiene `import.meta.glob` non aggiornato

Dopo aver aggiunto `features/customers/locales/*.json`, 7 test fallivano senza un motivo visibile:

```text
availableNamespaces = ["common", "orders"]      ← manca "customers"
i18n.t('customers:form.name') = "form.name"
```

La causa è `node_modules/.vitest-cache`, che conserva la trasformazione di `shared/i18n/i18n.ts` con il risultato vecchio del glob. Rimossa la cache, i test passano.

**Impatto su kyfes:** lo stop gate esegue `npm run test` in locale, quindi un agente che aggiunge una feature viene bloccato da un errore che non dipende dal suo codice e che è difficile da diagnosticare. In CI non succede (cache vuota).

**Correzione suggerita:** disattivare la cache persistente di Vitest nello scaffold oppure documentare `vitest --clearCache` nella skill `kyfes-architecture`.

### 6.2 La regola `duplicates` blocca chi segue lo scaffold

Riprendendo i pattern della feature `orders`, cioè l'esempio di riferimento, `arch_check` blocca:

```text
[duplicates] OrdersChart.tsx:18  uguale a CustomersChart.tsx:17   (spinner / ErrorState con "Riprova" / EmptyState)
[duplicates] OrdersTable.tsx:50  uguale a CustomersTable.tsx:63   (stessa sequenza in tabella)
[duplicates] OrdersTable.tsx:130 uguale a CustomersTable.tsx:123  (contatore + "Carica altri")
[duplicates] OrdersTable.tsx:150 uguale a CustomersTable.tsx:131  (ConfirmDialog di eliminazione)
```

La regola è corretta, ma la seconda feature di qualsiasi progetto ci finisce dentro. Per sbloccare ho estratto in `shared/ui` tre componenti che lo scaffold dovrebbe già fornire, e usare nella feature `orders`:

- `QueryState` — sequenza caricamento → errore con riprova → vuoto → contenuto;
- `LoadMore` — contatore annunciato agli screen reader + "carica altri" finché c'è `nextCursor`;
- `ConfirmDeleteDialog` — conferma distruttiva legata a un record.

### 6.3 Test di parità delle chiavi i18n e plurali

`shared/i18n/locales.test.ts` richiede chiavi identiche in tutte le lingue. Con it/en va bene, ma aggiungendo una lingua con più categorie di plurale (ad esempio `pl`, che usa `_few`/`_many`) il test fallisce anche se le traduzioni sono corrette. È un limite da documentare prima che diventi un blocco.

---

## 7. Finding di gravità bassa

| Scaffold | Problema |
|---|---|
| tutti | Delete ottimistico: con due eliminazioni concorrenti il rollback della prima ripristina uno snapshot che contiene ancora la seconda, che riappare mentre è in volo. In React, Next e Angular `onSettled` rimuove la cache del dettaglio anche quando la delete fallisce. |
| Angular | `deploy/security-headers.conf`: l'`add_header` dentro `location /api/` annulla quelli del server, quindi le risposte API escono senza HSTS e nosniff; `proxy_pass https://` è senza `proxy_ssl_server_name on` e `proxy_ssl_verify`. |
| Next | Il matcher di `proxy.ts` (`(?!api…)`) esclude dalla CSP anche pagine come `/apidocs` e `/api-keys`; manca `global-error.tsx`. |
| Angular, Vue | Su 401 partono due `location.assign` di fila (interceptor + guard), e il `returnTo` dipende da quale vince. |
| Vue | `OrdersTable.vue`: testo visibile "Creato il", `aria-label` "Ordina per data di creazione" (WCAG 2.5.3, label-in-name). |
| SvelteKit | `{#key localeState.current}` rimonta tutto l'albero, quindi cambiando lingua si perde la bozza del form; `setLocale` di Paraglide scrive il cookie già all'avvio, che da lì in poi prevale sul `locale` di sessione. |

---

## 8. Cose verificate e risultate corrette

- XSRF: header `X-XSRF-TOKEN` inviato solo verso l'origine dell'API (React, Svelte, Angular, Next).
- `withCredentials`, timeout e normalizzazione degli errori con `correlationId`.
- `safeUrl` rifiuta `javascript:`, `data:`, `http:`, `//host` e i caratteri di controllo.
- `sanitizeHtml` (DOMPurify) rimuove script, handler, `style` e SVG, e forza `rel="noopener noreferrer"`.
- Next: QueryClient nuovo per ogni richiesta lato server e singleton nel browser, CSP con nonce.
- Parità delle chiavi i18n it/en in tutti gli scaffold; tutte le chiavi usate esistono.
- MSW e il codice dei mock vengono esclusi dalla build di produzione (React).
- Installer idempotente; nessun file dello scaffold sovrascritto senza `--force`.
- La regola `duplicates` intercetta correttamente un copia-incolla reale (§6.2).

---

## 9. Priorità di intervento

| # | Intervento | Finding |
|---|---|---|
| 1 | Correggere `safeRedirect` nei 5 scaffold e aggiungere i casi `/.//`, `/..//`, `/%2e%2e//` ai test | H1 |
| 2 | Confrontare i path senza distinzione di maiuscole (config protetta e livelli) | H2 |
| 3 | Rifare l'anti-loop dello stop gate (non uscire su `stop_hook_active`) e il criterio "ci sono modifiche" (non solo `git status`) | H3, H4 |
| 4 | Coprire le scritture via Bash, o rendere `.kyfes/` non scrivibile tramite i permessi, e documentare il limite | H5 |
| 5 | Interrompere il loop 403 su `/auth/me` in Next | H6 |
| 6 | Controllare in pre-write il file risultante per gli Edit; trovare il progetto partendo dal file scritto | M1, M2 |
| 7 | Rafforzare le regex: `window.`/`globalThis.` per fetch ed eval, `Function(` senza `new`, confini di parola su token/auth, segreti non quotati in `.env`, confine di host per `localhost`/`example.com` | §4.1, §4.2 |
| 8 | Allineare gli scaffold: campi non scrivibili mai inviati, controllo sul record nella rotta di modifica, refresh single-flight, contratto di `fieldErrors` e `/orders/stats`, 403 come "non autorizzato" | §5 |
| 9 | Fornire `QueryState`, `LoadMore` e `ConfirmDeleteDialog` negli scaffold; gestire la cache di Vitest | §6 |
| 10 | Portare tutti i casi di questo report in `tests/hooks/test_hooks.py` e nei test degli scaffold, così da non tornare indietro | tutti |

---

## Appendice A — Script della batteria di bypass

Uso: `python3 bypass.py <progetto con kyfes installato>`

```python
import json, subprocess, sys, pathlib

proj = pathlib.Path(sys.argv[1]).resolve()
pre = proj / "tools/kyfes/plugins/kyfes/scripts/pre_write.py"
C = "src/features/customers/components/X.tsx"
cases = [
    # (atteso, file, contenuto, descrizione)
    ("deny", C, "localStorage.token = jwt", "token via proprietà"),
    ("deny", C, "/**/ localStorage.setItem('token', t)", "riga che inizia con commento"),
    ("deny", C, "window.fetch('/api/orders')", "window.fetch"),
    ("deny", C, "window.eval(code)", "window.eval"),
    ("deny", C, "const f = Function('return 1')", "Function senza new"),
    ("deny", C, "switch (user.role) { case 'admin': return <Del/> }", "switch sul ruolo"),
    ("deny", ".KYFES/config.json", "{}", "config protetta con maiuscole"),
    ("deny", ".env", "CLIENT_SECRET=abcdef1234567890", "segreto non quotato in .env"),
    ("allow", C, "localStorage.setItem('accessibility-mode', 'high')", "falso positivo: 'access'"),
    # … gli altri casi della tabella §4.1 e §4.2
]
for exp, rel, content, desc in cases:
    ev = {"cwd": str(proj), "hook_event_name": "PreToolUse", "tool_name": "Write",
          "tool_input": {"file_path": str(proj / rel), "content": content}}
    r = subprocess.run([sys.executable, "-B", str(pre)], input=json.dumps(ev), capture_output=True, text=True)
    out = json.loads(r.stdout) if r.stdout.strip() else {}
    got = "deny" if (out.get("hookSpecificOutput") or {}).get("permissionDecision") == "deny" else "allow"
    print(f"{'OK  ' if got == exp else 'BUG '} atteso={exp:5} ottenuto={got:5} {desc}")
```

## Appendice B — Prove dello stop gate

```bash
G=tools/kyfes/plugins/kyfes/scripts
printf "import axios from 'axios';\nexport const z = axios;\n" > src/features/customers/components/Bad.tsx

# H3: blocca la prima volta, consente la seconda
echo '{"cwd":"'$PWD'","session_id":"t1","hook_event_name":"Stop","stop_hook_active":false}' | python3 $G/stop_gate.py   # → block
echo '{"cwd":"'$PWD'","session_id":"t1","hook_event_name":"Stop","stop_hook_active":true}'  | python3 $G/stop_gate.py   # → (vuoto) consentito

# H4: dopo un commit il gate non gira
git add -A && git commit -qm wip
echo '{"cwd":"'$PWD'","session_id":"t2","hook_event_name":"Stop","stop_hook_active":false}' | python3 $G/stop_gate.py   # → (vuoto) consentito
python3 -B $G/arch_check.py .                                                                                           # → [library-boundary] Bad.tsx:1

# M1: monorepo, cwd senza config
echo '{"cwd":"'$(dirname $PWD)'","tool_name":"Write","tool_input":{"file_path":"'$PWD'/src/features/customers/components/Y.tsx","content":"localStorage.setItem(\"token\", t)"}}' \
  | env -u CLAUDE_PROJECT_DIR python3 $G/pre_write.py   # → (vuoto) consentito
```

---

## 10. Stato delle correzioni (19 ottobre 2026)

Tutti i punti del report sono stati corretti. Durante le correzioni un secondo giro di attacchi contro il motore nuovo ha trovato altri 13 bypass, chiusi anch'essi. Ogni caso è coperto da un test di regressione.

### 10.1 Verifica finale

| Controllo | Esito |
|---|---|
| Test del kit (`tests/hooks`: `test_hooks.py` + nuovo `test_hardening.py`) | ✓ 43 test (erano 20) |
| Scaffold React — install, lint, typecheck, test, build, `arch_check --strict` | ✓ 99 test (erano 80) |
| Scaffold Next.js | ✓ 115 test (erano 55) |
| Scaffold Vue | ✓ 100 test (erano 61) |
| Scaffold Angular | ✓ 94 test (erano 51) |
| Scaffold SvelteKit | ✓ 95 test (erano 50) |
| Frontend `customers` (§2) sotto il motore nuovo | ✓ nessun falso positivo |

Comando: `bash tests/run.sh --scaffolds` (lo stesso della CI).

### 10.2 Finding di gravità alta

| # | Correzione |
|---|---|
| H1 | In tutti e 5 gli scaffold `safeRedirect` valida anche il percorso normalizzato e decodificato. I vettori `/.//`, `/a/..//`, `/%2e%2e//`, `/..//`, `/./%2F/` e `/%5C` sono nei test. |
| H2 | `rules.canonical_rel()` riporta ogni componente del path al nome reale su disco; i file protetti si confrontano senza distinzione di maiuscole. |
| H3 | Lo stop gate non si sblocca più su `stop_hook_active`. Blocca fino a `max_blocks` volte di fila nella stessa catena, poi lascia chiudere con l'avviso "NON è conforme"; una catena nuova riparte da zero. |
| H4 | Nuovo hook `SessionStart` (`session_start.py`) che registra HEAD. Lo stop gate gira anche se HEAD è diverso dalla baseline oppure, senza baseline, se ci sono commit non pubblicati. |
| H5 | Nuovo `bash_guard.py` su `Bash` (Codex: `Bash\|shell\|exec_command\|local_shell`). Nega:<br>• le modifiche ai file protetti e `disableAllHooks`;<br>• le scritture via shell in `src` e nei `.env`, seguendo i `cd` e le cartelle di destinazione;<br>• `git apply`/`patch` e `install.sh --force/--uninstall`.<br>Barriere aggiuntive: `NotebookEdit` coperto, file protetti estesi (impostazioni dell'agente, kit, hook, CI), regole `permissions.deny` scritte dall'installer. |
| H6 | Next: le query di sessione non invalidano più la sessione su 403 (`meta.ignoreForbidden`). Un test verifica al massimo 2 chiamate. |

### 10.3 Hook e regole (§4)

- **Bypass della tabella §4.1:** tutti e 25 chiusi (`BYPASSES` in `test_hardening.py`, su tutti e 5 i layout).
- **Falsi positivi del §4.2:** risolti. Le chiavi di storage sono divise in parole; i valori che sono chiavi i18n o segnaposto non contano come segreti.
- **Domini riservati:** i domini RFC 2606/6761 (`*.example.com`, `.test`, `.invalid`…) sono ammessi. Il falso positivo era emerso in un test dello scaffold Next.
- **M1, monorepo:** il progetto si trova risalendo dal file scritto. Dalla radice, lo stop gate e il guard controllano i progetti kyfes sotto il cwd.
- **M2:** `pre_write` valuta il file risultante (Write, Edit, MultiEdit, apply_patch ricostruito). Le violazioni preesistenti non bloccano edit non correlati.
- **M3:** i commenti vengono rimossi da un mini-tokenizer che conserva stringhe, regex e numeri di riga.
- **M4:** confini estesi a client HTTP, librerie di server state, grafici, i18n e sanitizer alternativi. Le librerie di cookie lato client sono vietate ovunque.
- **Secondo giro (chiusi):**
  - `setItem` su alias e `localforage`;
  - `fetch`/`eval` usati come valori o con `bind/call/apply`;
  - `window['ev'+'al']`;
  - `import`/`require` con nome calcolato (nuova regola `dynamic-import`);
  - `cd src && echo > X.ts`;
  - `mv`/`cp -r` verso cartelle di `src`;
  - `tar -C src`, `unzip -d src`.

### 10.4 Scaffold (§5, §6, §7)

| Punto | Stato |
|---|---|
| §5.1 Permessi per campo | I form inviano solo i campi scrivibili, in creazione e in PATCH. I mock applicano condizioni e campi con un utente `operator`, in tutti e 5. |
| §5.2 Controllo sul record nella modifica | Aggiunto in Vue, Angular, Next e SvelteKit; React era già corretto. |
| §5.3 Refresh single-flight | Contatore dei refresh riusciti in tutti e 5; `onUnauthorized` una sola volta. |
| §5.4 Contratto | Next allineato (`fieldErrors: string[]`, `/orders/stats` `{ months }`, refresh anche su `/auth/me`); 403 mostrato come "non autorizzato" ovunque; refresh attivo di default in Angular. |
| §5.5 Sessione | Locale sconosciuto → `undefined`; regole sconosciute accettate, semplicemente non fanno match. |
| §5.6 Errori | SvelteKit: `OrderForm` con try/catch e `fieldErrors`, refresh attivato nell'app. React: cancellazioni non convertite in `NETWORK_ERROR`. Ovunque: niente retry su `ZodError`. |
| §6.1 Cache di Vitest | `fsModuleCache: false` (in Angular la imposta già il builder). |
| §6.2 Duplicati | `QueryState`, `LoadMore` e `ConfirmDeleteDialog` in `shared/ui` di ogni scaffold, usati dalla feature orders. |
| §6.3 Plurali | Il test di parità i18n ignora i suffissi plurali. |
| §7 Gravità bassa | Corretti:<br>• delete concorrenti;<br>• header nginx e `proxy_ssl_verify` (Angular: `proxy_ssl_trusted_certificate` va impostato prima del deploy);<br>• matcher del proxy e `global-error.tsx` (Next);<br>• doppio redirect al login (Vue, Angular);<br>• aria-label (Vue);<br>• `{#key}` e cookie della lingua (SvelteKit). |

### 10.5 Limiti residui (dichiarati)

- **Gli hook restano euristici.** Codice offuscato abbastanza (stringhe costruite a runtime e passate ad API non note, script npm che scrivono file) può sfuggire ai controlli in scrittura. Le barriere successive sono:
  - lo stop gate, non più aggirabile con un commit né con `stop_hook_active`;
  - le regole `permissions.deny` di Claude Code;
  - la CI con `arch_check --strict`, che rilegge sempre il codice su disco.
- **Il guard di Bash non vede dentro gli script eseguiti** (`node scripts/x.js`, `npm run <script>`). Le modifiche che producono vengono comunque verificate dallo stop gate e dalla CI.
