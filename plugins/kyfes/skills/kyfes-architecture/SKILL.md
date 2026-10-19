---
name: kyfes-architecture
description: Regole vincolanti per progettare, pianificare e scrivere codice frontend (React, Next.js, Vue, Angular, SvelteKit) - alberatura src/, sicurezza (sessione in cookie HttpOnly/Secure, CSRF, CSP, XSS), client HTTP unico (axios), TanStack Query, RBAC con CASL sul CRUD, i18n, grafici, test. Usala prima di ogni piano o modifica di codice in un progetto frontend.
---

# kyfes — Know Your Frontend

Queste regole sono vincolanti per ogni piano e ogni riga di codice frontend. Se una richiesta le viola, dichiaralo e proponi l'alternativa conforme prima di scrivere codice.

La configurazione del progetto è in `.kyfes/config.json` (framework, cartelle, alias, comandi di controllo). Leggila all'inizio del lavoro: i percorsi indicati lì prevalgono su quelli di esempio. Il file lo modifica solo l'utente, come `tools/kyfes/`, le impostazioni e gli hook dell'agente (`.claude/settings*.json`, `.codex/hooks.json`, `.codex/config.toml`) e i file di kyfes in `.claude/rules/`, `.agents/skills/`, `.codex/agents/` e `.github/workflows/`: gli hook rifiutano ogni modifica, anche via shell. Il codice si scrive con gli strumenti di modifica dei file (Write/Edit, `apply_patch`), non con redirect, `sed -i`, `cp`/`mv` o `git apply` da shell, così le regole valutano il risultato.

Le API delle librerie cambiano spesso: prima di usare un'API di cui non sei certo (versione maggiore nuova, opzione rinominata) consulta la documentazione aggiornata (Context7 o sito ufficiale). Le regole qui sotto non cambiano con la versione.

Dettagli per framework, con i nomi esatti di file e API: `references/<framework>.md` (`react`, `next`, `vue`, `angular`, `svelte`). Leggi solo quello del framework configurato.

## 1. Stack di riferimento

| Ambito | React (Vite) | Next.js (App Router) | Vue 3 (Vite) | Angular | SvelteKit |
|---|---|---|---|---|---|
| Routing | React Router | App Router | Vue Router | Angular Router | file system |
| Client HTTP | axios | axios (client) + `fetch` solo lato server in `shared/api/server` | axios | `HttpClient` + interceptor | axios (client) + `event.fetch` lato server |
| Server state | TanStack Query | TanStack Query | TanStack Vue Query | TanStack Angular Query | TanStack Svelte Query |
| Client state | Zustand (solo stato UI) | Zustand | Pinia | signals | rune `$state` |
| RBAC | CASL + `@casl/react` | CASL + `@casl/react` | CASL + `@casl/vue` | CASL + `@casl/angular` | CASL + store |
| i18n | i18next + react-i18next | next-intl | vue-i18n | Transloco | Paraglide JS |
| Grafici | Recharts | Recharts | ECharts (`vue-echarts`) | ECharts (`ngx-echarts`) | ECharts |
| Validazione | Zod (+ React Hook Form) | Zod (+ React Hook Form) | Zod (+ VeeValidate) | Zod + Reactive Forms | Zod |
| Sanitizzazione | DOMPurify | DOMPurify | DOMPurify | sanitizer Angular + DOMPurify | DOMPurify |
| Test | Vitest, Testing Library, MSW, Playwright + axe | idem | Vitest, Vue Testing Library, MSW, Playwright | Vitest, Testing Library, MSW, Playwright | Vitest, Testing Library, MSW, Playwright |

TypeScript `strict` ovunque (anche `noUncheckedIndexedAccess`); la versione è quella accettata dal compilatore del framework e da typescript-eslint (oggi 6.0.x, fissata con `~`). ESLint flat config, Prettier. Nessuna libreria alternativa a quelle della tabella senza una decisione esplicita dell'utente.

## 2. Alberatura `src/` (identica in ogni progetto)

Quattro livelli, sempre gli stessi nomi. Le dipendenze vanno **solo verso il basso**: `app → pages → features → shared`.

```text
src/
├── app/                       ← bootstrap: provider, router, layout radice, error boundary, stili globali
├── pages/                     ← una pagina per rotta: compone le feature, nessuna logica di dati
├── features/
│   └── <feature>/             ← un bounded context della UI (kebab-case, plurale: orders, customers)
│       ├── api/               ← <feature>.api.ts (endpoint + parse Zod), <feature>.queries.ts (chiavi + queryOptions/hook), <feature>.mutations.ts
│       ├── components/        ← componenti della feature (presentazione + uso degli hook di api/)
│       ├── model/             ← <feature>.schema.ts: schemi Zod e tipi derivati (z.infer)
│       ├── locales/           ← it.json, en.json: namespace = nome della feature
│       ├── permissions.ts     ← soggetto CASL della feature e helper (es. Subject 'Order')
│       └── index.ts           ← API pubblica della feature: unico punto importabile da pages/app
└── shared/
    ├── api/                   ← UNICO punto con il client HTTP: istanza axios, interceptor, ApiError, QueryClient, paginazione
    ├── auth/                  ← sessione (/auth/me), login/logout via BFF, guard di rotta
    ├── rbac/                  ← Ability CASL, tipi Actions/Subjects, <Can>/can(), guard per permesso
    ├── i18n/                  ← setup della libreria i18n, caricamento lazy dei namespace, formatter Intl
    ├── charts/                ← wrapper dei grafici (unico punto con la libreria di chart)
    ├── ui/                    ← design system: componenti senza logica di business
    ├── lib/                   ← funzioni pure (sanitizeHtml, safeRedirect, formatter, …)
    └── config/                ← env.ts: variabili pubbliche validate con Zod
```

Mappatura per framework (i nomi interni restano gli stessi):

| Livello | React / Vue | Next.js | Angular | SvelteKit |
|---|---|---|---|---|
| app | `src/app` | `src/app` (layout, provider; le rotte sono le pagine) | `src/app` (`app.config.ts`, `app.routes.ts`) | `src/hooks*.ts`, `src/app.html`, `src/routes/+layout.*` |
| pages | `src/pages` | `src/app/**/page.tsx` | `src/app/pages` | `src/routes/**/+page.*` |
| features | `src/features` | `src/features` | `src/app/features` | `src/lib/features` |
| shared | `src/shared` | `src/shared` | `src/app/shared` | `src/lib/shared` |

Regole:
1. Una feature importa da `shared` e da sé stessa. **Mai** dai file interni di un'altra feature: se serve, si importa dal suo `index.ts`, e se l'uso è frequente la parte comune scende in `shared`.
2. `shared` non importa mai da `features`, `pages` o `app`.
3. Le pagine sono sottili: leggono parametri di rotta, compongono componenti delle feature, impostano titolo e permesso della rotta.
4. In `shared/` esistono solo le sottocartelle elencate. Una nuova sottocartella è una decisione architetturale: va proposta all'utente.
5. Nomi file: componenti `PascalCase.tsx|vue|svelte` (Angular: `kebab-case.component.ts`), il resto `kebab-case.ts` o `<feature>.<ruolo>.ts`. Test accanto al file (`*.test.ts`) o in `e2e/`.
6. Niente codice duplicato: un blocco di 8+ righe uguale in due punti blocca la chiusura del lavoro. Si estrae: dati → `features/<f>/api`, trasformazione pura → `shared/lib`, UI generica → `shared/ui`. Per stati di caricamento/errore/vuoto, paginazione e conferme si usano i componenti esistenti di `shared/ui` (4.3), non una copia del markup della feature `orders`.

## 3. Sicurezza (bloccante)

### 3.1 Autenticazione: sessione in cookie, mai token in JavaScript
- Pattern **BFF** (Backend-for-Frontend): il login OIDC (Authorization Code + PKCE) lo fa il server. Il browser riceve solo un cookie di sessione `__Host-session`: `HttpOnly; Secure; SameSite=Lax` (o `Strict`); `Path=/`; nessun `Domain`.
- Il frontend **non vede, non legge, non salva** access token, refresh token o id token: niente `localStorage`, `sessionStorage`, IndexedDB, variabili globali, header `Authorization: Bearer` costruiti nel browser, `document.cookie = …`.
- Tutte le chiamate vanno all'origine stessa (`/api/...`, reverse proxy/CDN davanti al backend) con `withCredentials: true`. Se l'API è su un altro dominio: CORS con origini esplicite e `credentials`, mai `*`.
- Sessione: `GET /api/auth/me` → `{ user, rules, locale }` (`rules` = regole CASL impacchettate). È una query TanStack (`sessionQuery`), unica fonte di verità di utente e permessi.
- Login: navigazione a `/api/auth/login?returnTo=<path>` (un solo redirect anche con più 401 in parallelo); logout: `POST /api/auth/logout`, poi `queryClient.clear()` e redirect. `returnTo` passa sempre da `safeRedirect()` (solo percorsi relativi della stessa origine: niente `//`, schemi o backslash, controllati anche sul risultato normalizzato e decodificato, così `/.//host` non esce dall'origine).
- 401 da qualunque chiamata → refresh **single-flight** (`POST /api/auth/refresh`: una sola richiesta in volo, le altre la attendono) e la richiesta originale è ripetuta una sola volta. Un contatore dei refresh riusciti evita un secondo refresh per le richieste partite prima di un refresh già concluso: si ripetono e basta. Se il refresh fallisce (o il backend non lo espone), `onUnauthorized` porta al login una sola volta. Gli endpoint `/auth/refresh|login|logout` non entrano in questo giro.
- Solo HTTPS (HSTS `max-age=63072000; includeSubDomains; preload`). Nessun URL `http://` o `ws://` nel codice, salvo `localhost` in sviluppo.

### 3.2 CSRF
- Per i metodi non sicuri (`POST`, `PUT`, `PATCH`, `DELETE`) il client invia l'header `X-XSRF-TOKEN` letto dal cookie `XSRF-TOKEN` (double-submit) impostato dal server. axios: `xsrfCookieName: 'XSRF-TOKEN'`, `xsrfHeaderName: 'X-XSRF-TOKEN'`, `withXSRFToken` solo per l'origine dell'API. Angular: `withXsrfConfiguration`. Next/SvelteKit server actions: controllo `Origin` lato server.
- Le richieste che cambiano stato non usano mai `GET`.

### 3.3 XSS e contenuti
- Niente HTML grezzo: `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `innerHTML`/`outerHTML`/`insertAdjacentHTML`, `document.write`, `createContextualFragment`, `srcdoc`, `bypassSecurityTrust*` sono vietati, salvo `v-html="sanitizeHtml(x)"` o equivalente con `sanitizeHtml` sulla stessa riga, importato da `shared/lib` (DOMPurify) e mai ridefinito o rinominato nel file.
- Vietati `eval` (anche `window.eval`), `Function(...)` con o senza `new`, `setTimeout`/`setInterval` con stringa, e `import()`/`require()` con un nome calcolato.
- URL forniti dall'utente passano da `safeUrl()` (`https:`, `mailto:`, `tel:`, relativi); mai `javascript:`.
- `target="_blank"` sempre con `rel="noopener noreferrer"`.
- `postMessage`: verifica sempre `event.origin` contro una lista esplicita.
- CSP senza `unsafe-inline`/`unsafe-eval` (in produzione; il dev server può richiederli): con SSR nonce per richiesta + `strict-dynamic`; per una SPA statica senza script inline basta `script-src 'self'`. Esempio completo: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'self'`. Inoltre `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimale. Script di terze parti con SRI.

### 3.4 Segreti e configurazione
- Nel bundle finisce solo ciò che ha il prefisso pubblico (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`, `NG_APP_`): mai segreti, chiavi API private, password. Variabili lette solo in `shared/config/env.ts` e validate con Zod. Nei `.env` versionati niente segreti, nemmeno senza virgolette; i valori di esempio stanno in `.env.example`.
- Nessuna libreria di cookie lato client (js-cookie, universal-cookie, react-cookie, vue-cookies, ngx-cookie-service): i cookie li imposta il server.
- Source map di produzione non pubbliche. Messaggi d'errore all'utente generici, con `correlationId` (vedi 4.3). Nessun dato personale nei log.
- Lockfile versionato, `npm audit --omit=dev --audit-level=high` in CI, dipendenze con versioni bloccate dal lockfile.

## 4. Dati: client HTTP, TanStack Query, errori

### 4.1 Client HTTP unico
- `axios` (Angular: `HttpClient`) si importa **solo** in `shared/api`, come ogni altro client HTTP o di rete (ky, ofetch, got, socket.io-client, graphql-request, Apollo, urql, …). `fetch` (anche `window.fetch`, `globalThis.fetch`), `XMLHttpRequest`, `WebSocket`, `EventSource` e `navigator.sendBeacon` non si usano altrove (eccezione: codice server di Next/SvelteKit nei percorsi `server_globs` della config).
- `shared/api/http.ts` crea l'istanza: `baseURL` da env, `withCredentials: true`, XSRF (3.2), `timeout`, header `Accept: application/json`. Interceptor di risposta: 401 (3.1), normalizzazione in `ApiError`; una richiesta annullata (`AbortSignal`) si rilancia così com'è, non diventa un errore di rete.
- `ApiError { status, code, message, correlationId, fieldErrors? }`: il formato degli errori del backend (compatibile con kybes: `code`, `message`, `correlationId`). I componenti non leggono mai `error.response` di axios.

### 4.2 TanStack Query
- Ogni lettura è una query, ogni scrittura una mutation, definite in `features/<f>/api`. I componenti non chiamano mai il client HTTP.
- Chiavi con factory per feature: `orderKeys.all`, `.lists()`, `.list(filters)`, `.details()`, `.detail(id)`. Mai chiavi scritte a mano nei componenti.
- Le risposte si validano con lo schema Zod della feature dentro la `queryFn` (`OrderSchema.parse(data)`): i tipi derivano dagli schemi (`z.infer`), mai `any`.
- Default del `QueryClient` in `shared/api/query-client.ts`: `staleTime` > 0, retry solo per `ApiError` con `status` 0 o >= 500 (mai su 4xx, `ZodError` o altri errori), mutation senza retry, `refetchOnWindowFocus` ragionato. Le mutation invalidano le chiavi interessate (o aggiornano la cache con `setQueryData`/optimistic update con rollback).
- Create e update inviano solo i campi che l'utente può scrivere (sez. 5); l'update è un `PATCH` parziale.
- Delete con optimistic update sicuro con più eliminazioni in volo: `mutationKey` condivisa; in `onError` lo snapshot si ripristina solo se è l'ultima delete in corso (`isMutating(...) <= 1`), altrimenti le liste si marcano da rifare; il dettaglio si toglie dalla cache solo in `onSuccess`; liste e aggregati si invalidano quando finisce l'ultima.
- Liste: paginazione a cursore `Page { items, nextCursor, limit }` (stesso contratto di kybes) con `useInfiniteQuery`/`infiniteQueryOptions`; parametri `limit`, `cursor`, `sort` nella chiave.
- Stato client (filtri UI, pannelli) nello store del framework, mai copie dei dati del server.

### 4.3 Errori e UX
- Error boundary per rotta; stati `loading`/`error`/`empty` espliciti in ogni vista che legge dati.
- Componenti standard di `shared/ui` (React/Next `.tsx`, Vue `.vue`, Svelte `.svelte`, Angular `*Component`): `QueryState` per caricamento → errore con "riprova" → vuoto → contenuto, `LoadMore` per il piè di pagina delle liste a cursore (conteggio + "carica altri"), `ConfirmDeleteDialog` per confermare l'eliminazione di un record. Ogni nuova feature li usa invece di riscrivere il markup: copiare quello di `orders` fa scattare `duplicates`.
- Riuso delle costanti (regola `constant-reuse`, misurata da `arch_check`, bloccante oltre il 10% di valori duplicati): ogni valore di dominio è definito una volta e referenziato. Azioni RBAC dalle costanti di `shared/rbac`; soggetto e nomi dei campi nel `permissions.ts` della feature; namespace i18n come costanti (`COMMON_NS`, namespace della feature); stati, filtri, ordinamenti, colonne e default nel `model/`; percorsi UI in `routes.ts`, endpoint nell'`api/`; query key solo nella key factory; mapping come `Record<…>` tipizzati. Mai aggirare la metrica (stringhe costruite, `ignore_values` senza un vero falso positivo, codice spostato nei test).
- 403 → messaggio "non autorizzato" (senza "riprova") e invalidazione di `sessionQuery` (i permessi potrebbero essere cambiati), senza ciclo se è `/auth/me` a rispondere 403; 404 → pagina non trovata; 5xx → messaggio generico + `correlationId`.

## 5. RBAC sul CRUD (CASL)

- I permessi arrivano dal server (`/api/auth/me` → `rules`), si trasformano in una `Ability` in `shared/rbac` e si aggiornano quando cambia la sessione. Lo schema della sessione è tollerante: regole con azioni o soggetti sconosciuti non fanno match invece di invalidare la sessione. **La UI non decide mai in base ai nomi dei ruoli**: vietati `role === 'admin'` (anche invertito), `roles.includes('…')`, `[...].includes(role)`, `switch (role)`, `role.startsWith(...)`, `isAdmin`, `hasRole(...)` fuori da `shared/rbac`.
- Azioni: `create`, `read`, `update`, `delete` (+ `manage` = tutte). Soggetti: un sostantivo singolare PascalCase per feature (`Order`, `Customer`), dichiarato in `features/<f>/permissions.ts` e registrato nel tipo `Subjects` di `shared/rbac`.
- Ogni elemento CRUD della UI è condizionato dal permesso:
  - rotte: `read` sul soggetto (guard di rotta / `meta.permission`); senza permesso → pagina 403, non un redirect silenzioso; la rotta di modifica controlla `update` anche sul record caricato, prima di mostrare il form;
  - pulsanti "Nuovo", "Modifica", "Elimina": `can(ACTIONS.create|update|delete, ORDER_SUBJECT)`; per il record specifico `can(ACTIONS.update, subject(ORDER_SUBJECT, order))` (condizioni sul record; nello scaffold l'helper `orderSubject(order)` della feature);
  - campi: permessi per campo (`can(ACTIONS.update, orderSubject(order), ORDER_FIELDS.status)`) → campo in sola lettura se negato e assente dal payload (create e `PATCH` inviano solo i campi scrivibili);
  - azioni, soggetti e campi sono sempre costanti (sez. 9.1), mai letterali: i nomi sopra sono generici, quelli esatti di ogni framework (es. `ACTION.update` in Next/Vue, `Action.Update` in Angular/SvelteKit, `ORDER_FIELD.status` in Next/Vue) sono nella sezione "Costanti e riuso" di `references/<framework>.md`;
  - colonne/azioni di tabella e voci di menu: nascoste se negate.
- La UI nasconde, **il server decide**: ogni chiamata è comunque autorizzata dal backend; un 403 si gestisce come in 4.3. Mai fidarsi di flag di permesso salvati lato client.
- Test obbligatori per ogni feature: la stessa vista renderizzata con ability diverse mostra/nasconde le azioni CRUD attese. I mock MSW applicano le stesse regole (condizioni sul record, permessi per campo → 403), come negli scaffold con i profili `manager`, `viewer` e `operator`.

## 6. i18n

- Ogni testo visibile (anche `aria-label`, `title`, `placeholder`, `alt`, messaggi di errore e toast) passa dalla funzione di traduzione. Nessuna concatenazione di stringhe tradotte: interpolazione e plurali ICU.
- Namespace = nome della feature (`orders:list.title`), più `common`. I file `locales/<lingua>.json` stanno nella feature; il caricamento è lazy.
- Libreria importata solo in `shared/i18n` (che ri-esporta hook/funzioni per i componenti). Lingua iniziale: sessione → `navigator.language` → default di config; `<html lang>` aggiornato al cambio.
- Date, numeri e valute solo con i formatter `Intl` di `shared/i18n` (mai formattazione a mano).
- Le chiavi esistono in tutte le lingue configurate: un test confronta le chiavi dei file di locale, ignorando i suffissi plurali (le categorie di plurale cambiano da lingua a lingua).

## 7. Grafici

- Libreria di chart importata solo in `shared/charts`: le feature usano i wrapper (`LineChart`, `BarChart`, `PieChart`, …) che fissano tema, palette dai token, tooltip, formattazione `Intl`, responsive container.
- Accessibilità: titolo e descrizione (`role="img"` + `aria-label`), alternativa tabellare o riassunto testuale, colori non unica fonte di informazione.
- I dati arrivano da una query della feature, già trasformati in `api/` o `shared/lib` (mai trasformazioni nel componente grafico). Componenti di chart caricati in lazy (code splitting).

## 8. Qualità

- Accessibilità WCAG 2.2 AA: elementi semantici, focus visibile, label su ogni input, test axe in Playwright.
- Performance: code splitting per rotta, immagini con dimensioni, nessun import dell'intera libreria di icone.
- Test: unità/componenti con Vitest + Testing Library; rete simulata con MSW (gli handler stanno in `src/mocks`); e2e con Playwright. Ogni feature ha test per query/mutation, RBAC (sez. 5) e stato di errore.
- `console.log`, `any`, `@ts-ignore` non entrano nel codice committato.

## 9. Formato obbligatorio del piano

Ogni piano di una funzionalità contiene:
1. **Feature e file**: cartelle `features/<f>/…` e pagine toccate, con l'elenco dei file nuovi/modificati.
2. **Contratto API**: endpoint, metodi, schemi Zod di richiesta/risposta, paginazione, errori attesi.
3. **Query e mutation**: chiavi, `staleTime`, invalidazioni/optimistic update.
4. **Matrice RBAC**: per ogni rotta, pulsante, colonna e campo, l'azione e il soggetto CASL richiesti.
5. **Testi**: namespace e chiavi i18n nuove, in tutte le lingue.
6. **Sicurezza**: input utente renderizzati, URL esterni, upload, redirect — e come sono neutralizzati.
7. **Test**: unità, RBAC, errori, e2e/axe.
8. **Costanti**: tabella `valore → costante → modulo proprietario → nuova/riusata` per ogni valore di dominio
   introdotto o usato (azioni, soggetto, campi, namespace, stati, filtri, ordinamenti, colonne, rotte, endpoint,
   chiavi di query, mapping). Ogni valore già esistente si riusa; quelli nuovi nascono nel modulo indicato nella
   sez. 9.1. Nessun letterale ripetuto nel codice previsto.
9. **Violazioni e alternative**: se la richiesta viola una regola, l'alternativa conforme.

Chiudi con task piccoli e indipendenti, ciascuno con i file coinvolti.

### 9.1 Nuova feature: dove nasce ogni costante

Ogni feature futura segue lo stesso schema, così il riuso è garantito per costruzione e `constant-reuse` resta verde:

| Valore | Costante | Dove |
|---|---|---|
| nome della feature | `<F>_FEATURE` (es. `CUSTOMERS_FEATURE = 'customers'`) | `model/` della feature; namespace i18n, segmento di rotta, endpoint e radice delle query key **derivano** da qui (template `` `/${CUSTOMERS_FEATURE}` ``), non si riscrivono |
| soggetto CASL | `<F>_SUBJECT` | `permissions.ts` (registrato nel registro dei soggetti di `shared/rbac`) |
| campi con permesso | `<F>_FIELDS` (mappa `campo → campo`, `satisfies` sulle chiavi del modello) | `permissions.ts` |
| azioni | costanti delle azioni di `shared/rbac` (mai nuove stringhe `'update'`) | `shared/rbac` |
| namespace i18n | `<F>_NS` derivato dal nome della feature | `locales/` o `model/` della feature |
| stati, filtri, ordinamenti, colonne, default | mappe `as const` + tipi derivati (`<F>_STATUS`, `<F>_SORT`, `DEFAULT_<F>_SORT`, `<F>_COLUMNS`) | `model/<f>.schema.ts` o `model/<f>.constants.ts` |
| percorsi UI | `<f>Paths` | `routes.ts` |
| endpoint | `<F>_ENDPOINT` | `api/<f>.api.ts` |
| query e mutation key | key factory `<f>Keys` | `api/<f>.queries.ts` |
| mapping (stato → variante, colonna → etichetta) | `Record<Tipo, …>` tipizzato | componente o `model/` della feature |
| valori trasversali (valuta, varianti dei pulsanti, tipi di grafico, flag di env, header) | costante esportata | modulo `shared/*` che li possiede |

Regole operative:
- Prima di scrivere un letterale di dominio, cerca se esiste già (`grep` sul valore): se esiste, importa la costante.
  L'hook in scrittura rifiuta un letterale (o una nuova costante) uguale a una costante esportata che il file può
  importare (di `shared`, della stessa feature, o di una feature se scrivi in pagine/app) e indica quale; lo stop
  gate blocca se più del 10% dei valori del progetto è duplicato. Mai importare costanti di un'altra feature per
  far tornare i conti: un valore comune a più feature va spostato in `shared`.
- I test e i mock usano le stesse costanti (soprattutto per le regole RBAC dei mock), salvo i test che simulano
  dati del server non ancora noti al client.
- Due concetti diversi con lo stesso testo (`'/customers'` come rotta e come endpoint) si ottengono derivandoli dal
  nome della feature, non scrivendo due letterali. Solo se è davvero impossibile, chiedi all'utente di aggiungere il
  valore a `constant_reuse.ignore_values` (l'agente non può modificare `.kyfes/config.json`).

## 10. Checklist di revisione

- [ ] Nessun token/segreto nel browser; sessione solo via cookie `HttpOnly`/`Secure`; `withCredentials` e XSRF configurati in `shared/api`.
- [ ] Nessun `http://`, HTML grezzo non sanitizzato, `eval`, `target="_blank"` senza `rel`.
- [ ] Client HTTP, librerie di i18n, chart e CASL importati solo nelle loro cartelle di `shared`.
- [ ] Dipendenze solo verso il basso; nessun import interno tra feature.
- [ ] Ogni lettura/scrittura in `features/<f>/api` con TanStack Query, chiavi dalla factory, risposta validata con Zod.
- [ ] Ogni azione CRUD condizionata da `can()`; payload con i soli campi scrivibili; nessun controllo su nomi di ruolo; 403 gestito.
- [ ] Ogni testo visibile tradotto, in tutte le lingue; formattazioni con `Intl`.
- [ ] Stati loading/error/empty con `QueryState`, liste con `LoadMore`, eliminazioni con `ConfirmDeleteDialog`; error boundary; accessibilità.
- [ ] Valori di dominio (azioni, soggetti, campi, namespace, stati, filtri, colonne, rotte, endpoint) definiti una volta e referenziati: `arch_check` riporta il riuso costanti sotto il 10%.
- [ ] Test RBAC, errori e query presenti e verdi; `stop_gate.commands` verdi.
