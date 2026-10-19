---
name: kyfes-architecture
description: Regole vincolanti per progettare, pianificare e scrivere codice frontend (React, Next.js, Vue, Angular, SvelteKit) - alberatura src/, sicurezza (sessione in cookie HttpOnly/Secure, CSRF, CSP, XSS), client HTTP unico (axios), TanStack Query, RBAC con CASL sul CRUD, i18n, grafici, test. Usala prima di ogni piano o modifica di codice in un progetto frontend.
---

# kyfes — Know Your Frontend

Queste regole sono vincolanti per ogni piano e ogni riga di codice frontend. Se una richiesta le viola, dichiaralo e proponi l'alternativa conforme prima di scrivere codice.

La configurazione del progetto è in `.kyfes/config.json` (framework, cartelle, alias, comandi di controllo). Leggila all'inizio del lavoro: i percorsi indicati lì prevalgono su quelli di esempio. Il file lo modifica solo l'utente.

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
6. Niente codice duplicato: un blocco di 8+ righe uguale in due punti blocca la chiusura del lavoro. Si estrae: dati → `features/<f>/api`, trasformazione pura → `shared/lib`, UI generica → `shared/ui`.

## 3. Sicurezza (bloccante)

### 3.1 Autenticazione: sessione in cookie, mai token in JavaScript
- Pattern **BFF** (Backend-for-Frontend): il login OIDC (Authorization Code + PKCE) lo fa il server. Il browser riceve solo un cookie di sessione `__Host-session`: `HttpOnly; Secure; SameSite=Lax` (o `Strict`); `Path=/`; nessun `Domain`.
- Il frontend **non vede, non legge, non salva** access token, refresh token o id token: niente `localStorage`, `sessionStorage`, IndexedDB, variabili globali, header `Authorization: Bearer` costruiti nel browser, `document.cookie = …`.
- Tutte le chiamate vanno all'origine stessa (`/api/...`, reverse proxy/CDN davanti al backend) con `withCredentials: true`. Se l'API è su un altro dominio: CORS con origini esplicite e `credentials`, mai `*`.
- Sessione: `GET /api/auth/me` → `{ user, rules, locale }` (`rules` = regole CASL impacchettate). È una query TanStack (`sessionQuery`), unica fonte di verità di utente e permessi.
- Login: navigazione a `/api/auth/login?returnTo=<path>`; logout: `POST /api/auth/logout`, poi `queryClient.clear()` e redirect. `returnTo` passa sempre da `safeRedirect()` (solo percorsi relativi della stessa origine: niente `//`, schemi o backslash).
- 401 da qualunque chiamata → l'interceptor invalida la sessione e porta al login. Se il backend espone `POST /api/auth/refresh`, il refresh è **single-flight** (una sola richiesta in volo, le altre in coda) e la richiesta originale è ripetuta una sola volta.
- Solo HTTPS (HSTS `max-age=63072000; includeSubDomains; preload`). Nessun URL `http://` o `ws://` nel codice, salvo `localhost` in sviluppo.

### 3.2 CSRF
- Per i metodi non sicuri (`POST`, `PUT`, `PATCH`, `DELETE`) il client invia l'header `X-XSRF-TOKEN` letto dal cookie `XSRF-TOKEN` (double-submit) impostato dal server. axios: `xsrfCookieName: 'XSRF-TOKEN'`, `xsrfHeaderName: 'X-XSRF-TOKEN'`, `withXSRFToken` solo per l'origine dell'API. Angular: `withXsrfConfiguration`. Next/SvelteKit server actions: controllo `Origin` lato server.
- Le richieste che cambiano stato non usano mai `GET`.

### 3.3 XSS e contenuti
- Niente HTML grezzo: `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `innerHTML`/`outerHTML`/`insertAdjacentHTML`, `document.write`, `bypassSecurityTrust*` sono vietati, salvo `v-html="sanitizeHtml(x)"` o equivalente con `sanitizeHtml` di `shared/lib` (DOMPurify) sulla stessa riga.
- Vietati `eval`, `new Function`, `setTimeout`/`setInterval` con stringa.
- URL forniti dall'utente passano da `safeUrl()` (`https:`, `mailto:`, `tel:`, relativi); mai `javascript:`.
- `target="_blank"` sempre con `rel="noopener noreferrer"`.
- `postMessage`: verifica sempre `event.origin` contro una lista esplicita.
- CSP senza `unsafe-inline`/`unsafe-eval` (in produzione; il dev server può richiederli): con SSR nonce per richiesta + `strict-dynamic`; per una SPA statica senza script inline basta `script-src 'self'`. Esempio completo: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'self'`. Inoltre `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimale. Script di terze parti con SRI.

### 3.4 Segreti e configurazione
- Nel bundle finisce solo ciò che ha il prefisso pubblico (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`, `NG_APP_`): mai segreti, chiavi API private, password. Variabili lette solo in `shared/config/env.ts` e validate con Zod.
- Source map di produzione non pubbliche. Messaggi d'errore all'utente generici, con `correlationId` (vedi 4.3). Nessun dato personale nei log.
- Lockfile versionato, `npm audit --omit=dev --audit-level=high` in CI, dipendenze con versioni bloccate dal lockfile.

## 4. Dati: client HTTP, TanStack Query, errori

### 4.1 Client HTTP unico
- `axios` (Angular: `HttpClient`) si importa **solo** in `shared/api`. `fetch` e `XMLHttpRequest` non si usano altrove (eccezione: codice server di Next/SvelteKit nei percorsi `server_globs` della config).
- `shared/api/http.ts` crea l'istanza: `baseURL` da env, `withCredentials: true`, XSRF (3.2), `timeout`, header `Accept: application/json`. Interceptor di risposta: 401 (3.1), normalizzazione in `ApiError`.
- `ApiError { status, code, message, correlationId, fieldErrors? }`: il formato degli errori del backend (compatibile con kybes: `code`, `message`, `correlationId`). I componenti non leggono mai `error.response` di axios.

### 4.2 TanStack Query
- Ogni lettura è una query, ogni scrittura una mutation, definite in `features/<f>/api`. I componenti non chiamano mai il client HTTP.
- Chiavi con factory per feature: `orderKeys.all`, `.lists()`, `.list(filters)`, `.details()`, `.detail(id)`. Mai chiavi scritte a mano nei componenti.
- Le risposte si validano con lo schema Zod della feature dentro la `queryFn` (`OrderSchema.parse(data)`): i tipi derivano dagli schemi (`z.infer`), mai `any`.
- Default del `QueryClient` in `shared/api/query-client.ts`: `staleTime` > 0, nessun retry sugli errori 4xx, `refetchOnWindowFocus` ragionato. Le mutation invalidano le chiavi interessate (o aggiornano la cache con `setQueryData`/optimistic update con rollback).
- Liste: paginazione a cursore `Page { items, nextCursor, limit }` (stesso contratto di kybes) con `useInfiniteQuery`/`infiniteQueryOptions`; parametri `limit`, `cursor`, `sort` nella chiave.
- Stato client (filtri UI, pannelli) nello store del framework, mai copie dei dati del server.

### 4.3 Errori e UX
- Error boundary per rotta; stati `loading`/`error`/`empty` espliciti in ogni vista che legge dati.
- 403 → messaggio "non autorizzato" e invalidazione di `sessionQuery` (i permessi potrebbero essere cambiati); 404 → pagina non trovata; 5xx → messaggio generico + `correlationId`.

## 5. RBAC sul CRUD (CASL)

- I permessi arrivano dal server (`/api/auth/me` → `rules`), si trasformano in una `Ability` in `shared/rbac` e si aggiornano quando cambia la sessione. **La UI non decide mai in base ai nomi dei ruoli**: vietati `role === 'admin'`, `roles.includes('…')`, `isAdmin`, `hasRole(...)` fuori da `shared/rbac`.
- Azioni: `create`, `read`, `update`, `delete` (+ `manage` = tutte). Soggetti: un sostantivo singolare PascalCase per feature (`Order`, `Customer`), dichiarato in `features/<f>/permissions.ts` e registrato nel tipo `Subjects` di `shared/rbac`.
- Ogni elemento CRUD della UI è condizionato dal permesso:
  - rotte: `read` sul soggetto (guard di rotta / `meta.permission`); senza permesso → pagina 403, non un redirect silenzioso;
  - pulsanti "Nuovo", "Modifica", "Elimina": `can('create'|'update'|'delete', subject)`; per il record specifico `can('update', subject('Order', order))` (condizioni sul record);
  - campi: permessi per campo (`can('update', order, 'status')`) → campo in sola lettura se negato;
  - colonne/azioni di tabella e voci di menu: nascoste se negate.
- La UI nasconde, **il server decide**: ogni chiamata è comunque autorizzata dal backend; un 403 si gestisce come in 4.3. Mai fidarsi di flag di permesso salvati lato client.
- Test obbligatori per ogni feature: la stessa vista renderizzata con ability diverse mostra/nasconde le azioni CRUD attese.

## 6. i18n

- Ogni testo visibile (anche `aria-label`, `title`, `placeholder`, `alt`, messaggi di errore e toast) passa dalla funzione di traduzione. Nessuna concatenazione di stringhe tradotte: interpolazione e plurali ICU.
- Namespace = nome della feature (`orders:list.title`), più `common`. I file `locales/<lingua>.json` stanno nella feature; il caricamento è lazy.
- Libreria importata solo in `shared/i18n` (che ri-esporta hook/funzioni per i componenti). Lingua iniziale: sessione → `navigator.language` → default di config; `<html lang>` aggiornato al cambio.
- Date, numeri e valute solo con i formatter `Intl` di `shared/i18n` (mai formattazione a mano).
- Le chiavi esistono in tutte le lingue configurate: un test confronta le chiavi dei file di locale.

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
8. **Violazioni e alternative**: se la richiesta viola una regola, l'alternativa conforme.

Chiudi con task piccoli e indipendenti, ciascuno con i file coinvolti.

## 10. Checklist di revisione

- [ ] Nessun token/segreto nel browser; sessione solo via cookie `HttpOnly`/`Secure`; `withCredentials` e XSRF configurati in `shared/api`.
- [ ] Nessun `http://`, HTML grezzo non sanitizzato, `eval`, `target="_blank"` senza `rel`.
- [ ] Client HTTP, librerie di i18n, chart e CASL importati solo nelle loro cartelle di `shared`.
- [ ] Dipendenze solo verso il basso; nessun import interno tra feature.
- [ ] Ogni lettura/scrittura in `features/<f>/api` con TanStack Query, chiavi dalla factory, risposta validata con Zod.
- [ ] Ogni azione CRUD condizionata da `can()`; nessun controllo su nomi di ruolo; 403 gestito.
- [ ] Ogni testo visibile tradotto, in tutte le lingue; formattazioni con `Intl`.
- [ ] Stati loading/error/empty; error boundary; accessibilità.
- [ ] Test RBAC, errori e query presenti e verdi; `stop_gate.commands` verdi.
