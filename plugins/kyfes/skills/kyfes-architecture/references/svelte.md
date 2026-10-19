# kyfes — SvelteKit (Svelte 5 runes)

Scaffold di riferimento: `templates/scaffold/svelte/`. Livelli: app = `src/hooks*.ts`, `src/env.ts`, `src/app.html`; pages = `src/routes/**`; features = `src/lib/features`; shared = `src/lib/shared`; alias `$lib/` → `src/lib/`.

## Versioni (scaffold verificato)

| Libreria | Versione | Note |
|---|---|---|
| @sveltejs/kit / svelte / vite | ^3.1.0 / ^5.57.2 / ^8.3.4 | Kit 3: configurazione nel plugin `sveltekit({...})` di `vite.config.ts` (niente `svelte.config.js`) |
| @sveltejs/adapter-node | ^6.0.0 | scelto per avere nonce CSP per richiesta e header in `hooks.server.ts` |
| @tanstack/svelte-query | ^6.3.4 (core 5.104) | API a runes: `createQuery(() => options)` restituisce un oggetto reattivo, non uno store |
| axios | ^1.20.0 | |
| @casl/ability | ^7.0.2 | nessun pacchetto Svelte ufficiale: store/contesto e `Can` sono in `shared/rbac` |
| @inlang/paraglide-js / @inlang/plugin-message-format | ^2.29.0 / ^4.5.4 | plugin caricato da `./node_modules/...` (niente CDN in build) |
| echarts | ^6.1.0 | import modulari da `echarts/core` |
| zod / dompurify | ^4.6.7 / ^3.4.17 | Zod 4 è Standard Schema: usato anche in `defineEnvVars` |
| vitest / jsdom / @testing-library/svelte / msw | ^5.0.5 / ^30.1.3 / ^5.4.2 / ^3.0.3 | |
| @playwright/test / @axe-core/playwright | ^1.64.1 / ^4.14.0 | |
| typescript / svelte-check | **^6.0.3** / ^4.7.7 | TS 7 escluso: peer di kit (`^6`), svelte-check e typescript-eslint (`<6.1`) |
| eslint / typescript-eslint / eslint-plugin-svelte | ^10.13.0 / ^8.71.2 / ^3.23.1 | flat config con `defineConfig` di `eslint/config` |

`npm install` pulito, senza `--legacy-peer-deps`, 0 vulnerabilità.

## Mappa dei file

```text
src/app.html, app.d.ts (App.Error: message, code, correlationId)
src/env.ts              defineEnvVars (Kit 3) con gli schemi Zod di shared/config/env.schema.ts
src/hooks.server.ts     header di sicurezza + paraglideMiddleware (<html lang> dal cookie/Accept-Language)
src/hooks.client.ts     init: in dev con PUBLIC_API_MOCKS=true avvia il worker MSW
src/routes/             +layout.ts (ssr=false, crea il QueryClient), +layout.svelte (provider), AppShell.svelte (nav,
                        lingua, logout), +error.svelte (403/404/5xx), +page.svelte, orders/+layout.ts (guard auth +
                        read Order), orders/+page.svelte, orders/new/+page.{ts,svelte} (create Order),
                        orders/[id]/+page.svelte, orders/[id]/edit/+page.{ts,svelte} (update Order)
src/lib/features/orders/ api/orders.{api,queries,mutations}.ts, components/{OrdersTable,OrderForm,OrderEditor,
                        OrderDetail,OrdersChart}.svelte + order-status.ts, model/orders.schema.ts,
                        locales/{it,en}.json, permissions.ts, index.ts
src/lib/shared/         api/ auth/ rbac/ i18n/ (paraglide/ generato) charts/ lib/ config/
                        ui/ (theme.css, Button, ConfirmDialog, ConfirmDeleteDialog, QueryState, LoadMore,
                        ErrorState, EmptyState, Spinner, ForbiddenPage, NotFoundPage, StatusPage)
src/mocks/              data.ts, handlers.ts, browser.ts, node.ts, render.ts + TestProviders.svelte,
                        sveltekit-globals.ts, vitest-setup.ts
project.inlang/settings.json, e2e/orders.spec.ts, playwright.config.ts, vite.config.ts (anche Vitest)
```

`src/routes/+layout.svelte` è livello **pages** per arch_check: non può importare `@tanstack/*`, `@casl/*`, Paraglide. Per questo i provider sono componenti di shared (`QueryProvider` in `shared/api`, `AbilityProvider` in `shared/rbac`, `LocaleBoundary` in `shared/i18n`) e gli stili globali stanno in `shared/ui/theme.css`.

## Configurazione (`vite.config.ts`)

```ts
sveltekit({
  adapter: adapter(),
  alias: { $lib: 'src/lib' },          // Kit 3 non genera più $lib (default: #lib in package.json "imports")
  csp: { mode: 'auto', directives: { 'default-src': ['self'], 'script-src': ['self', 'strict-dynamic'],
    'style-src': ['self'], 'connect-src': ['self'], 'object-src': ['none'], 'base-uri': ['none'],
    'frame-ancestors': ['none'], /* img/font/worker/form-action */ } },
}),
paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/shared/i18n/paraglide',
  emitTsDeclarations: true, strategy: ['cookie', 'preferredLanguage', 'baseLocale'] }),
{ ...msw({ mode: 'worker-only' }), apply: 'serve' },   // serve /mockServiceWorker.js solo in dev
server: { proxy: { '/api': { target: env.API_ORIGIN ?? 'http://localhost:8080', changeOrigin: true } } },
```

- `tsconfig.json` estende **`$app/tsconfig`** (Kit 3; non più `./.svelte-kit/tsconfig.json`) e aggiunge `strict`, `noUncheckedIndexedAccess`.
- `npm run typecheck` = `svelte-kit sync && npm run i18n:compile && svelte-check --fail-on-warnings` (il codice Paraglide deve esistere prima del controllo).

## Variabili d'ambiente (Kit 3)

`$env/*` è deprecato: le variabili si dichiarano in `src/env.ts` e si leggono da `$app/env/public` — **solo** in `shared/config/env.ts`.

```ts
// src/env.ts
export const variables = defineEnvVars({
  PUBLIC_API_BASE_URL: { public: true, static: true, schema: publicEnvSchemas.PUBLIC_API_BASE_URL },
  PUBLIC_DEFAULT_LOCALE: { public: true, static: true, schema: publicEnvSchemas.PUBLIC_DEFAULT_LOCALE },
  PUBLIC_API_MOCKS: { public: true, static: true, schema: publicEnvSchemas.PUBLIC_API_MOCKS },
});
// shared/config/env.ts
import { PUBLIC_API_BASE_URL, PUBLIC_API_MOCKS, PUBLIC_DEFAULT_LOCALE } from '$app/env/public';
export const env = { API_BASE_URL: PUBLIC_API_BASE_URL, DEFAULT_LOCALE: PUBLIC_DEFAULT_LOCALE, API_MOCKS: PUBLIC_API_MOCKS } as const;
```

Il prefisso `PUBLIC_` non è più obbligatorio in Kit 3 (conta `public: true`) ma resta per la regola 3.4. `static: true` inlinea i valori: con `dev && env.API_MOCKS` il worker MSW sparisce dalla build. `$app/environment` → **`$app/env`**.

## Client HTTP e XSRF (`shared/api/http.ts`)

```ts
export const http = axios.create({
  baseURL: env.API_BASE_URL, withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN', xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: (config) => isSameOrigin(config.url),   // header solo verso l'origine dell'app/API
  timeout: 15_000, headers: { Accept: 'application/json' },
});
onUnauthorized(handler);        // registrati da shared/auth: installAuthHandlers(queryClient) attiva anche
enableSessionRefresh(true);     // il refresh (default on); senza POST /api/auth/refresh nel BFF: { refresh: false }
```

- Interceptor: le cancellazioni (`AbortSignal` di TanStack Query, passato da `ordersApi`) sono rilanciate così come sono. 401 su endpoint non di auth (`/auth/refresh|login|logout` esclusi) con refresh attivo: ogni richiesta riceve un istante di un orologio logico; se è partita **prima** dell'ultimo refresh riuscito viene solo ripetuta (aveva il vecchio cookie), altrimenti `POST /auth/refresh` **single-flight** (promise condivisa) e ripetizione **una** volta (`_kyfesRetried`). Se il refresh fallisce `onUnauthorized()` è chiamato una sola volta da `refreshSession`, non per ogni richiesta in attesa; senza refresh è chiamato direttamente. Ogni errore diventa `ApiError { status, code, message, correlationId, fieldErrors }` (body validato con Zod, fallback header `x-correlation-id`).
- `createAppQueryClient()`: `staleTime` 30 s, `retry: shouldRetry` (max 2, solo `ApiError` con `status` 0 o >= 500; mai su 4xx né su errori non HTTP come `ZodError`), mutation `retry: false`, `enabled: browser`.
- `pageSchema(Item)` → `{ items, nextCursor: string|null, limit }`; `PageParams { limit, cursor?, sort? }`; `toPageQuery()`.
- `QueryProvider.svelte` avvolge `QueryClientProvider`. Il client nasce in `routes/+layout.ts` (`load` → `{ queryClient }`) così i guard nei `load` figli lo ricevono da `await parent()`.

## Sessione e guard (`shared/auth`)

```ts
sessionQueryOptions()          // queryOptions su GET /auth/me, SessionSchema { user{id,name,email}, rules, locale? }
useSession()                   // createQuery(() => sessionQueryOptions())
login(returnTo?)               // window.location.assign(`/api/auth/login?returnTo=${safeRedirect(returnTo)}`)
logout(queryClient) / useLogout()   // POST /auth/logout → queryClient.clear() → redirect
installAuthHandlers(queryClient)    // in +layout.svelte: refresh attivo; 401 non recuperabile → rimuove la sessione e
                                    // login; 403 su query/mutation → invalidate sessione
await requireAuth(queryClient, url) // nei load: sessione o login (promise che non si risolve)
```

`returnTo` di default usa `navigating.to?.url` (`$app/state`): durante una navigazione client l'URL giusto è quello di destinazione, non la pagina corrente.

- `safeRedirect` (`shared/lib`) accetta solo path relativi della stessa origine e controlla anche il risultato: il `pathname` normalizzato e la sua versione decodificata non devono iniziare con `//` né contenere `\` (`/..//x`, `/%2e%2e//x`, `/%2F/x`, `/.//host` → fallback).
- `SessionSchema` è tollerante: `locale` sconosciuto o `null` → `undefined` (si ricade su cookie/navigator/default) invece di far fallire la sessione; `RawRuleSchema` (`rbac/rules.schema.ts`) accetta azioni e soggetti come stringhe qualsiasi, quelli ignoti all'app non fanno mai match.

## RBAC (`shared/rbac`)

```ts
type AppAbility = MongoAbility<[Actions, Subjects], MongoQuery>;
buildAbility(rules)                       // createMongoAbility<AppAbility>(rules)
SUBJECT_TYPES = ['Order'] as const        // registro: ogni feature aggiunge qui il suo soggetto
class AbilityState { can(...) / cannot(...) / update(rules) }  // $state "version" bump su ability.on('updated')
```

- `AbilityProvider.svelte` legge `useSession()` e in `$effect.pre` chiama `update(session.data?.rules ?? [])`. `update` usa `untrack`: senza, l'effetto legge e scrive la versione → `effect_update_depth_exceeded`.
- Componenti: `const ability = useAbility(); ability.can('update', asOrderSubject(order), 'status')`; markup: `<Can I="create" a={ORDER_SUBJECT}>…</Can>` (props `I`, `a`, `field`, `not`).
- `asOrderSubject(order)` = `subject('Order', { ...order })`: **sempre su copia**, CASL definisce una proprietà sull'oggetto e i dati in cache/proxy `$state` non vanno mutati.
- Guard: `await requirePermission(queryClient, 'read', 'Order')` → `error(403, 'Forbidden', { code: 'FORBIDDEN' })` (firma Kit 3: messaggio + proprietà) → `+error.svelte` mostra `ForbiddenPage`. Legge la sessione con `fetchQuery`, non `ensureQueryData`: dopo un 403 la sessione invalidata va riletta, non presa dalla cache.
- Il guard conosce solo il tipo. `orders/[id]/edit/+page.ts` controlla `update Order`; la condizione sul record la verifica `OrderEditor` dopo il caricamento (`ability.can('update', asOrderSubject(order))`, altrimenti `<ErrorState forbidden />` e nessun form), e poi il server.
- Permessi per campo: `canWriteOrderField(ability, field, order?)` (`create Order <field>` per un nuovo ordine, `update <record> <field>` per uno esistente); `OrderForm` disabilita i campi non scrivibili e `pickWritableFields` li toglie dal payload (`OrderPayloadSchema = OrderInputSchema.partial()`), sia in POST sia in PATCH.

## TanStack Svelte Query (feature `orders`)

```ts
export const orderKeys = { all: ['orders'] as const, lists: () => [...], list: (f) => [...], details, detail: (id) => [...], stats };
export function ordersInfiniteQueryOptions(filters = {}) {
  return infiniteQueryOptions({ queryKey: orderKeys.list(normalized),
    queryFn: ({ pageParam }) => ordersApi.list({ ...normalized, cursor: pageParam }),
    initialPageParam: undefined as string | undefined, getNextPageParam: (last) => last.nextCursor ?? undefined });
}
export const useOrders = (filters = () => ({})) => createInfiniteQuery(() => ordersInfiniteQueryOptions(filters()));
export const createOrderMutationOptions = mutationOptions({
  mutationFn: (input: OrderInput) => ordersApi.create(input),
  onSuccess: (order, _vars, _result, { client }) => { client.setQueryData(orderKeys.detail(order.id), order);
    return invalidateListsAndStats(client); } });
export const useCreateOrder = () => createMutation(() => createOrderMutationOptions);
```

- Callback delle mutation (core 5.10x): `onMutate(vars, { client })`, `onSuccess/onError/onSettled(..., onMutateResult, { client })`: il `QueryClient` arriva dal contesto, niente `useQueryClient` nelle options.
- Update: `updateOrderMutationOptions` → `ordersApi.update(id, payload)` = **`PATCH /orders/:id`** con i soli campi scrivibili; `onSuccess` aggiorna il dettaglio e invalida liste e statistiche.
- Delete ottimistico: `mutationKey` condivisa (`deleteOrderMutationKey`); `cancelQueries(lists)` → `getQueriesData` → `setQueriesData` (filtra da tutte le pagine). In `onError` lo snapshot è ripristinato solo se nessun'altra delete è in volo (`isMutating({ mutationKey }) > 1`), altrimenti le liste sono marcate stale; `onSettled` rimuove il dettaglio solo se la delete è riuscita e, se è l'ultima, invalida liste e statistiche.
- Statistiche: `toMonthlyTotals` produce `{ label, value }[]` per i grafici (etichette con `formatDate`); è applicato da `OrdersChart` in un `$derived`, non come `select` (TanStack memoizza `select`: le etichette non seguirebbero il cambio lingua).
- Stati di caricamento in `shared/ui`: `<QueryState query={q} isEmpty emptyTitle>` (spinner → errore con retry → vuoto → snippet `children(data)`), `<LoadMore summary query>` per la paginazione a cursore, `<ConfirmDeleteDialog item onconfirm onclose>` (aperto finché `item` è definito). `ErrorState` mostra "non autorizzato" (senza retry) per un `ApiError` 403 o con la prop `forbidden`.
- Nei template: `orders.isPending`, `orders.isError`, `orders.data?.pages`, `orders.fetchNextPage()`; mai destrutturare il risultato (si perde la reattività).

## i18n (Paraglide JS 2)

- `project.inlang/settings.json`: `baseLocale: "it"`, `locales: ["it","en"]`, `modules: ["./node_modules/@inlang/plugin-message-format/dist/index.js"]`, `pathPattern` **array**: `./src/lib/shared/i18n/locales/{locale}.json` (namespace `common_*`) e `./src/lib/features/orders/locales/{locale}.json` (`orders_*`). Nuova feature = nuova riga in `pathPattern`.
- Chiavi piatte con prefisso del namespace (`orders_list_title`), così l'uso è `m.orders_list_title()` (riconosciuto da arch_check). Plurali in formato inlang (`declarations` + `selectors` + `match`).
- "Lazy": Paraglide compila un modulo per messaggio (`message-modules`); ogni chunk di rotta contiene solo i messaggi che usa, quindi i namespace delle feature viaggiano con le loro rotte. Non esiste caricamento runtime dei JSON.
- `shared/i18n/index.ts` ri-esporta `m`, `localeState`, `changeLocale`, `initLocale`, `locales`, `formatDate`, `formatNumber`, `formatCurrency`, `LocaleBoundary`, `LocaleSelect`. Paraglide (`paraglide/`, generato e ignorato da git/eslint/prettier/arch_check) si importa solo qui (e in `locale.svelte.ts`).
- Cambio lingua senza reload né remount: `localeState` è `$state` e `overwriteGetLocale(() => localeState.current)` rende reattivi `m.x()` e i formatter Intl usati in template e `$derived`; niente `{#key}` sulla lingua (le bozze dei form sopravvivono). `LocaleBoundary` aggiorna solo `<html lang>` in un `$effect`.
- Il cookie della lingua è scritto solo da `changeLocale` (scelta esplicita; anche `setLocale` di Paraglide vi è reindirizzato con `overwriteSetLocale`). `initLocale(session.locale)` in `AppShell` sceglie cookie → sessione → `navigator.language` → `PUBLIC_DEFAULT_LOCALE` senza scrivere il cookie. Lato server `paraglideMiddleware` sostituisce `%paraglide.lang%` in `app.html`.

## Grafici (`shared/charts`)

- `loadECharts()` importa dinamicamente `echarts/core` + `BarChart`, `LineChart`, `GridComponent`, `TooltipComponent`, `CanvasRenderer` e chiama `use([...])`: chunk separato caricato al primo grafico.
- `CategoryChart.svelte` (interno): `<figure>` con `div role="img" aria-label="titolo. descrizione"`, tabella dati in `<details>`, palette da `--chart-1..6` (`readTheme`), `ResizeObserver`, `dispose()` nel cleanup dell'`$effect`. `BarChart`/`LineChart` sono wrapper da 5 righe.
- Tooltip `renderMode: 'richText'` (disegnato sul canvas: niente `innerHTML` né style inline, compatibile con `style-src 'self'`), `valueFormatter` dai formatter Intl.

## Sicurezza del framework

- `adapter-node` (motivazione): CSP con **nonce per richiesta** (`csp.mode: 'auto'` → nonce sulle pagine dinamiche) e header in un solo punto (`hooks.server.ts`: HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP, X-Frame-Options, `Cache-Control: no-cache` sull'HTML; gli asset `/_app/immutable` sono già `immutable`). Con adapter-static gli header andrebbero replicati sul CDN e la CSP diventerebbe a hash in `<meta>` (senza `frame-ancestors`).
- `ssr = false` in `routes/+layout.ts`: i dati passano solo da axios lato client con il cookie di sessione; il server rende la shell. In produzione `/api` è servito dal reverse proxy/BFF sulla stessa origine.
- CSRF: header XSRF di axios + controllo `Origin` di SvelteKit (in Kit 3 sempre attivo, `csrf.trustedOrigins` per eccezioni).
- `{@html}` vietato (regola `svelte/no-at-html-tags`) salvo `{@html sanitizeHtml(x)}`. `svelte/no-navigation-without-resolve`: `href={resolve('/orders/[id]', { id })}` e `goto(resolve(...))` inline (la regola non segue helper che restituiscono `resolve`).
- Niente `style="…"` in markup/`app.html` (bloccato da `style-src 'self'`): `style:height={...}` di Svelte usa CSSOM ed è consentito.

## Test

- `vite.config.ts` → `test: { environment: 'jsdom', setupFiles: ['src/mocks/sveltekit-globals.ts', 'src/mocks/vitest-setup.ts'], fsModuleCache: false, server: { deps: { inline: ['msw'] } }, alias: { '@mswjs/interceptors/ClientRequest': <build node> } }` + `svelteTesting()`. `fsModuleCache: false`: una trasformazione in cache non aggiornata (es. dopo aver aggiunto file di lingua) fa fallire i test per motivi estranei al codice.
- `vitest-setup.ts`: `server.listen({ onUnhandledFrame: 'error' })` (MSW 3: `onUnhandledRequest` → **`onUnhandledFrame`**), `resetHandlers()` + `resetMockDb()` dopo ogni test, `changeLocale('it')`.
- `renderWithProviders(Component, { props, user: 'manager' | 'viewer' | 'operator' })` monta `QueryProvider` + `AbilityProvider` con la sessione servita da MSW: test RBAC realistici (`OrdersTable.test.ts`, `OrderForm.test.ts`, `OrderEditor.test.ts`, `routes/orders/orders-page.test.ts`).
- Mock (`src/mocks/handlers.ts`): il backend in memoria costruisce la stessa ability della sessione e applica condizioni e permessi per campo come un server reale (403 su un campo non scrivibile, 422 con `fieldErrors` su body non valido, `POST /api/auth/refresh`). Utente `operator`: crea e modifica solo `customerName`/`total`, modifica solo ordini `draft`, non imposta mai `status`.
- `locales.test.ts`: stesse chiavi tra le lingue e prefisso del namespace; i suffissi plurali (`_one`, `_few`, `_other`, …) sono ignorati nel confronto.
- Query/mutation fuori dai componenti: `client.fetchInfiniteQuery(options)`, `new InfiniteQueryObserver(client, options).fetchNextPage()`, `new MutationObserver(client, createOrderMutationOptions).mutate(input)`.
- E2E: `playwright.config.ts` avvia `vite dev` con `PUBLIC_API_MOCKS=true`; `e2e/orders.spec.ts` usa `?mockUser=viewer` (disponibili `manager` default, `viewer`, `operator`, `anonymous`) e `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa'])`.

## Trappole

1. **`$lib` rimosso in Kit 3** (default `#lib` via `package.json` `"imports"`, con estensione obbligatoria). Lo scaffold lo ridichiara con `alias: { $lib: 'src/lib' }` perché preset e arch_check ragionano su `$lib/`: Kit stampa il warning `config_option_deprecated_alias` a ogni comando (atteso). Con `#lib/...index.js` arch_check non risolverebbe gli import.
2. `svelte.config.js` non è più letto; `$app/stores` rimosso (usa `$app/state`); `$app/environment` → `$app/env`; tipi dei hook (`Handle`, `ClientInit`, `sequence`) da **`@sveltejs/kit/hooks`**; `event.request` è read-only: `resolve({ ...event, request })`.
3. `$app/env/public` in Vitest legge `globalThis.__sveltekit_dev.env`, iniettato solo dal dev server: senza `sveltekit-globals.ts` come **primo** setup file tutti i test falliscono all'import.
4. `svelteTesting()` aggiunge la condition `browser` (serve il runtime client di Svelte) e `@mswjs/interceptors/ClientRequest` risolve a `null`: inline di `msw` + alias al build Node.
5. jsdom ha `navigator.language = en-US`: Paraglide sceglierebbe `en`; fissare la lingua nel setup.
6. Svelte Query 6: le options sono sempre una **funzione** (`createQuery(() => ...)`); il risultato è un proxy reattivo, da leggere come `query.data`.
7. I componenti che chiamano `useSession()`/`useAbility()` devono stare **sotto** `QueryProvider`/`AbilityProvider`: nel layout radice il markup è in `AppShell.svelte`, non nello script di `+layout.svelte`.
8. `routes/` non è livello app per arch_check: niente librerie (TanStack, CASL, Paraglide, ECharts) direttamente nelle pagine o nei layout; si passa dai wrapper di shared o dall'`index.ts` della feature.
