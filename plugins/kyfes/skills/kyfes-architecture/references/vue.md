# kyfes — Vue 3 (Vite)

Scaffold di riferimento: `templates/scaffold/vue/`. Livelli: `src/app`, `src/pages`, `src/features`, `src/shared`; alias `@/` → `src/`.

## Versioni (scaffold verificato)

| Libreria | Versione | Note |
|---|---|---|
| vue / vue-router / pinia | ^3.5.44 / ^5.4.0 / ^4.1.0 | router 5: API `createRouter` invariata, augment di `RouteMeta` |
| vite / @vitejs/plugin-vue | ^8.3.4 / ^6.0.10 | |
| @tanstack/vue-query | ^5.104.4 | |
| axios | ^1.20.0 | |
| @casl/ability / @casl/vue | ^7.0.2 / ^3.0.1 | |
| vue-i18n | ^11.4.16 | Composition API (`legacy: false`), compilazione JIT senza `new Function` (CSP ok) |
| echarts / vue-echarts | ^6.1.0 / ^8.3.2 | |
| zod / vee-validate | ^4.6.7 / ^4.15.1 | `@vee-validate/zod` richiede zod 3: **non usarlo**, c'è l'adattatore `toTypedSchema` in `shared/lib` |
| dompurify | ^3.4.17 | |
| vitest / jsdom / @testing-library/vue / msw | ^5.0.5 / ^30.1.3 / ^8.1.0 / ^3.0.3 | |
| @playwright/test / @axe-core/playwright | ^1.64.1 / ^4.14.0 | |
| typescript / vue-tsc | **~6.0.3** / ^3.3.13 | TS 7 escluso: `typescript-eslint` 8 ha peer `typescript <6.1` |
| eslint / typescript-eslint / eslint-plugin-vue | ^10.13.0 / ^8.71.2 / ^10.11.1 | flat config con `defineConfig` di `eslint/config` |

`@vue/eslint-config-typescript` non è usato: trascina `fast-glob → braces` con advisory *high* (fallirebbe `npm audit --audit-level=high`). Si usano direttamente `typescript-eslint` + `vue-eslint-parser` + `eslint-config-prettier/flat`.

## Mappa dei file

```text
src/app/          main.ts (bootstrap, MSW in dev, configureHttp), providers.ts (Pinia, VueQueryPlugin, i18n, RBAC,
                  registrazione namespace, createUnauthorizedHandler), App.vue (lingua iniziale, errore della navigazione
                  con Riprova), router/index.ts (guard), router/navigation-state.ts, router/routes.ts, styles.css
src/pages/        MainLayout.vue (nav + lingua + logout + ErrorBoundary), OrdersPage, OrderDetailPage, OrderEditPage,
                  NewOrderPage, ForbiddenPage, NotFoundPage, route-names.ts (nomi rotta usati da pages e app)
src/features/orders/  api/orders.{api,queries,mutations}.ts, components/{OrdersTable,OrderForm,OrderDetail,OrdersChart}.vue,
                  model/orders.schema.ts, locales/{it,en}.json, stores/orders-ui.store.ts (Pinia, solo UI), permissions.ts, index.ts
src/shared/       api/ auth/ rbac/ i18n/ charts/ ui/ lib/ config/env.ts
src/shared/ui/    AppButton, LoadingState/EmptyState/ErrorState, ErrorBoundary, ConfirmDialog, QueryState, LoadMore, ConfirmDeleteDialog,
                  ForbiddenState (.vue, barrel index.ts)
src/mocks/        data.ts, handlers.ts, browser.ts (worker), node.ts (server), vitest.setup.ts
src/test/         render.ts (renderWithProviders, withSetup, createTestQueryClient)
deploy/security-headers.conf, e2e/orders.spec.ts, playwright.config.ts, vite.config.ts (anche config Vitest)
```

## Client HTTP e XSRF (`shared/api/http.ts`)

```ts
export const http = axios.create({
  baseURL: env.API_BASE_URL, withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN', xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: (config) => isApiOriginUrl(config.url), // header solo verso l'origine dell'API
  timeout: 15_000, headers: { Accept: 'application/json' },
})
configureHttp({ refresh: true, onUnauthorized: createUnauthorizedHandler(queryClient) }) // in app/main.ts
// createUnauthorizedHandler (app/providers.ts): queryClient.clear() + login(navigationTarget())
```

- Interceptor di risposta: 401 → (se `refresh`) `POST /auth/refresh` **single-flight** (una promise condivisa) e ripetizione della richiesta una volta (`_retried`). Un interceptor di richiesta salva in `_generation` il contatore dei refresh riusciti (`sessionGeneration`): un 401 su una richiesta partita prima dell'ultimo refresh riuscito viene ripetuto **senza** nuovo refresh. Se il refresh fallisce → `onUnauthorized` una sola volta per refresh fallito, anche con più 401 concorrenti. Senza `refresh`, o se la richiesta già ripetuta riceve di nuovo 401, viene chiamato `onUnauthorized` (nessun secondo refresh).
- Le URL `/auth/refresh|login|logout` non fanno mai refresh né chiamano `onUnauthorized`: l'errore viene solo normalizzato.
- Ogni errore axios diventa `ApiError { status, code, message, correlationId, fieldErrors }` (`toApiError`: body validato con Zod, fallback sull'header `x-correlation-id`). Le cancellazioni (`axios.isCancel`, AbortSignal di TanStack Query) vengono rilanciate così come sono, non come `NETWORK_ERROR`.
- Le feature usano `getParsed(url, Schema, { params, signal })`, `sendParsed('post'|'put'|'patch', url, body, Schema)`, `deleteRequest(url)`: niente axios fuori da `shared/api`.
- `createQueryClient({ onError })`: `staleTime` 30 s, `retry: shouldRetry`: massimo 2, solo su `ApiError` con status 0 (rete/timeout) o >= 500; mai su 4xx né su errori non HTTP (es. `ZodError`). In `app/providers.ts` un 403 (non della sessione) invalida `sessionKeys.all`.
- `pageSchema(Item)` → `{ items, nextCursor: string|null, limit }`; `PageParams { limit, cursor?, sort? }`; `toPageQuery()`.

## Sessione (`shared/auth`)

```ts
sessionQueryOptions()          // queryKey ['session','me'], GET /auth/me parse SessionSchema, staleTime 5 min, retry false
useSession()                   // { data, user, isPending, ... }
ensureSession(queryClient)     // per i guard: fetchQuery, riusa la cache solo se fresca (dopo un 403 la sessione invalidata si ricarica)
login(returnTo)                // window.location.assign(`${API_BASE_URL}/auth/login?returnTo=${encodeURIComponent(safeRedirect(returnTo))}`), idempotente (flag `redirecting`)
useLogout() / logout(qc)       // POST /auth/logout → queryClient.clear() → location.assign('/')
createAuthGuard(queryClient)   // router.beforeEach: rotte senza meta.public richiedono la sessione; 401 → login(to.fullPath); fetch annullato (isCancelledError) → false
```

- Un solo redirect al login: `onUnauthorized` usa `navigationTarget()` (`app/router/navigation-state.ts`: la navigazione in corso, altrimenti l'URL attuale) come `returnTo`; il `login(to.fullPath)` del guard è quindi di norma un no-op.
- `safeRedirect(target, fallback = '/')` rifiuta `//host`, schemi, backslash e caratteri di controllo, e ricontrolla il path normalizzato da `URL` e decodificato (`/.//host`, `/a/..//host`, `/%2e%2e//host`, `/%2F/host` → fallback). `/a/../orders` → `/orders`.
- `SessionSchema` è tollerante: `locale` sconosciuto, regionale (`en-US`) o `null` → `undefined` (`.catch(undefined)`); `action`/`subject` delle regole sono stringhe libere, quindi una regola che il client non conosce non fa match invece di invalidare la sessione.
- Prima navigazione fallita (es. `/auth/me` 5xx o body non valido): `main.ts` monta comunque l'app (`router.isReady().catch(...)`), `trackNavigation` (registrato in `createAppRouter` prima degli altri guard) salva l'errore in `failedNavigation` e `App.vue` mostra `ErrorState` con Riprova (`router.replace(target)`) al posto del `RouterView`.

## RBAC (`shared/rbac`)

```ts
export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage'
export const SUBJECTS = ['Order'] as const            // registro: una voce per feature
export type Subjects = SubjectName | ForcedSubject<SubjectName> | 'all'
export type AppAbility = MongoAbility<[Actions, Subjects]>
buildAbility(rules)                                    // createMongoAbility<AppAbility>(rules)
createRbacPlugin(queryClient)                          // app.use(...): abilitiesPlugin + sync con la query della sessione
```

- La sincronizzazione usa `queryClient.getQueryCache().subscribe(...)` sul `queryHash` della sessione: fetch, invalidazione e `clear()` (logout) aggiornano la stessa istanza con `ability.update(rules)`; `@casl/vue` la rende reattiva.
- Nei componenti: `const ability = useAbility()` → `ability.can('update', orderSubject(order), 'status')`; nel template `v-if="ability.can('create', ORDER_SUBJECT)"`. Disponibile anche `<Can I="create" a="Order">` (tipi del componente generici).
- Feature: `permissions.ts` → `ORDER_SUBJECT = 'Order' as const satisfies SubjectName`, `orderSubject(order) = subject('Order', { ...order })` (copia: CASL marca l'oggetto, i dati in cache restano intatti), `ORDER_FIELDS = ['customerName','status','total']`.
- La rotta `order-edit` controlla solo il tipo (`update Order`); `OrderEditPage.vue` controlla il record caricato (`ability.can('update', orderSubject(order))`, es. condizioni sullo stato) e altrimenti mostra `ForbiddenState`.
- **Guard `meta.permission`** (`createPermissionGuard`): legge `to.matched[].meta.permission = { action, subject }`, costruisce l'ability dalla sessione e, se negato, restituisce `{ name: 'forbidden', params: { pathMatch: to.path.slice(1).split('/') }, query, hash, replace: true }`: si vede la pagina 403 **con l'URL richiesto** (nessun redirect silenzioso). In `routes.ts` le rotte `not-found` e `forbidden` hanno lo stesso pattern `:pathMatch(.*)*`: l'URL risolve sempre la prima (404), la seconda si raggiunge solo per nome.

```ts
{ path: 'orders/new', name: 'order-new', component: () => import('@/pages/NewOrderPage.vue'),
  meta: { namespaces: ['orders'], titleKey: 'orders.title', permission: { action: 'create', subject: 'Order' } } }
```

## TanStack Vue Query (`features/orders/api`)

```ts
export const orderKeys = { all: ['orders'] as const, lists: () => [...], list: (p) => [...orderKeys.lists(), p],
  details: () => [...], detail: (id) => [...orderKeys.details(), id], stats: () => [...orderKeys.all, 'stats'] }
ordersInfiniteQueryOptions(params) // infiniteQueryOptions({ queryKey: orderKeys.list({...params, limit}),
                                   //   initialPageParam: undefined as string|undefined, getNextPageParam: p => p.nextCursor ?? undefined })
useOrdersInfinite(() => ({ sort: sort.value, status: status.value })) // useInfiniteQuery(computed(() => options)) + orders flat
useOrder(() => props.id)           // useQuery(computed(() => orderQueryOptions(toValue(id))))
useOrderStatsChart()               // dati già pronti per il grafico (formatMonth) — nessuna trasformazione nel chart
```

Mutation: `useCreateOrder`/`useUpdateOrder` (input `Partial<OrderInput>`; `ordersApi.update` = `PATCH`) → `setQueryData(detail)` + `invalidateOrderLists()` (lists + stats). `useDeleteOrder` (`mutationKey: deleteOrderMutationKey`, condivisa da tutte le delete): `onMutate` → `cancelQueries` + snapshot `getQueriesData(lists)` + `setQueriesData` che filtra l'id; `onError` → ripristino dello snapshot solo se è l'ultima delete in volo (`isMutating({ mutationKey }) > 1` altrimenti), negli altri casi solo `invalidateQueries(lists, { refetchType: 'none' })`; `onSuccess` → `removeQueries(detail)`; `onSettled` → invalidazione solo dall'ultima delete in volo. Le opzioni reattive si passano come `computed(() => options)` o getter: `useQuery(options)` con oggetto statico non reagisce ai cambi di parametri.

## Form (VeeValidate + Zod 4)

```ts
const { defineField, handleSubmit, errors, setErrors } = useForm({
  validationSchema: toTypedSchema(OrderInputSchema), initialValues: { ... } })
const [customerName, customerNameAttrs] = defineField('customerName')
```

I messaggi degli schemi sono chiavi i18n (`z.string().min(1, { error: 'common.validation.required' })`); il template mostra `message(errors.x)` = `te(x) ? t(x) : x` (i messaggi del server sono già testo). Gli `ApiError.fieldErrors` sui campi del form vanno in `setErrors`; chiavi che non sono campi del form → errore generico.

Permessi per campo: `writable` = i campi di `ORDER_FIELDS` per cui `ability.can('create', ORDER_SUBJECT, f)` (o `can('update', orderSubject(order), f)`); i non scrivibili sono `readonly` (`status` `:disabled`) con un hint, e `writablePayload(values)` invia solo i campi scrivibili, sia in create sia in update (PATCH).

## i18n (`shared/i18n`)

- `createI18n({ legacy: false, locale: env.DEFAULT_LOCALE, fallbackLocale: 'it', messages: { it: { common }, en: { common } } })`: `common` è nel bundle, le feature sono lazy.
- Namespace = chiave di primo livello: `t('orders.list.title')`, `t('common.actions.save')`. Plurali: `t('orders.list.count', n)` con `"nessun ordine | 1 ordine | {count} ordini"`. Mai concatenare: `common.app.pageTitle = "{page} · Gestionale"`.
- La feature espone `ordersLocales = { it: () => import('./locales/it.json'), en: ... }`; `app/providers.ts` chiama `registerNamespace('orders', ordersLocales)`; le rotte dichiarano `meta.namespaces` e `router.beforeResolve` chiama `loadNamespaces(...)` (`mergeLocaleMessage`). Così `shared` non importa mai da `features`.
- `setLocale(l)` carica i namespace attivi, imposta `i18n.global.locale.value` e `document.documentElement.lang`. Lingua iniziale (App.vue, una volta): `resolveInitialLocale(session.locale)` → sessione → `navigator.language` → default.
- Componenti: `const { t } = useT()`. Formatter: `formatDate`, `formatNumber`, `formatCurrency(value, 'EUR')`, `formatMonth('2026-03')` (leggono la lingua reattiva).
- Nei messaggi vue-i18n `{`, `}`, `@`, `|` sono sintassi: per un letterale usare `{'@'}`.

## Grafici (`shared/charts`)

- `echarts.ts`: tree-shaking con `use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent])` + `import 'vue-echarts/style.css'`; `VChart` = default export di `vue-echarts`.
- `BarChart`/`LineChart` (props `label`, `categories`, `series[{name,data}]`, `valueFormat: 'number'|'currency'`) esportati con `defineAsyncComponent`: ECharts finisce in un chunk separato.
- `ChartFrame.vue`: `<div role="img" :aria-label="label">` + `<details>` con tabella dati (alternativa testuale). Palette da `--chart-1..5`, tooltip con `valueFormatter` Intl e `renderMode: 'richText'` (niente `innerHTML`, compatibile con CSP senza `unsafe-inline`).

## Sicurezza (SPA Vite)

- `deploy/security-headers.conf` (nginx): CSP `default-src 'self'; script-src 'self'; style-src 'self'; ...; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`, HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP; `/assets/` `immutable`, `index.html` `no-cache`, `.map` → 404, `/api/` in reverse proxy verso il BFF. Vite non genera script inline, quindi non serve nonce. Attenzione: in nginx un `location` con `add_header` proprio non eredita quelli del server, vanno ripetuti.
- `vite.config.ts`: `server.proxy['/api']` verso `API_ORIGIN` (variabile senza prefisso `VITE_`, mai nel bundle), `build.sourcemap: false`.
- `env.ts`: solo `VITE_API_BASE_URL`, `VITE_DEFAULT_LOCALE`, `VITE_API_MOCKS` (+ `VITE_MOCK_USER` letto solo da `src/mocks`). `API_BASE_URL` deve essere un path same-origin (inizia con `/`, non `//`, niente `\`): la CSP ha `connect-src 'self'` e il cookie è first-party; un'API cross-origin va dietro il reverse proxy.
- `v-html` è errore ESLint (`vue/no-v-html`); se serve davvero: `v-html="sanitizeHtml(x)"` sulla stessa riga + `<!-- eslint-disable-next-line vue/no-v-html -->`.

## Test

- `vite.config.ts` → `test: { environment: 'jsdom', setupFiles: ['./src/mocks/vitest.setup.ts'], include: ['src/**/*.test.ts'] }`. Il setup importa `@testing-library/jest-dom/vitest`, avvia `server.listen({ onUnhandledFrame: 'error' })` e chiama `cleanup()` a ogni test (senza `globals: true` Testing Library non lo fa da solo).
- MSW 3: `http`, `HttpResponse` da **`msw/http`** (non più da `msw`), `setupServer` da `msw/node`, `setupWorker` da `msw/browser`, opzione `onUnhandledRequest` rinominata `onUnhandledFrame`. Il worker in dev è servito dal plugin `msw/vite` (`{ ...msw({ mode: 'worker-only' }), apply: 'serve' }`): nessun `public/mockServiceWorker.js`, niente nel build.
- `renderWithProviders(Component, { session: sessions.manager | sessions.viewer, props, stubs })`: Pinia, VueQueryPlugin, i18n (it), router in memoria con le rotte dell'app, ability dalla sessione messa in cache con `setQueryData(sessionKeys.me(), session)`. `withSetup(() => useCreateOrder(), opts)` per testare composable.
- `fsModuleCache: false` nel blocco `test`: nessuna cache persistente dei moduli, ogni run trasforma dai sorgenti.
- Mock MSW: utenti `manager` (manage Order), `operator` (crea/modifica solo `customerName` e `total`, modifica solo le bozze) e `viewer` (solo lettura); `VITE_MOCK_USER=manager|operator|viewer`. Gli handler applicano condizioni e permessi per campo come un server reale (403 fuori dai permessi; in create lo `status` è opzionale, default `draft`).
- Test presenti: `shared/lib/*` (sanitize, safe-redirect anche dopo normalizzazione, safe-url), `shared/api/http.test.ts` (withCredentials/XSRF, header solo same-origin, ApiError + correlationId, 401, refresh single-flight, richiesta partita prima del refresh ripetuta senza nuovo refresh, `onUnauthorized` una volta per 401 concorrenti, endpoint auth, cancellazioni, `shouldRetry`), `shared/auth/session.schema.test.ts`, `shared/rbac/ability.test.ts`, `shared/config/env.test.ts`, `shared/ui/ErrorState.test.ts` (403 → "non autorizzato"), `OrdersTable.test.ts` e `OrdersPage.test.ts` (manager vs viewer + stato di errore), `OrderForm.test.ts` (operator: solo campi scrivibili in create e update, errori di campo del server), `pages/OrderEditPage.test.ts` (operator: non autorizzato se non bozza), `orders.queries.test.ts` (lista a cursore, Zod, create invalida, delete ottimistico con rollback, delete concorrenti), `app/router/router.test.ts` (403 con URL invariato, login con returnTo, sessione invalidata ricaricata), `app/bootstrap.test.ts` (errore con Riprova alla prima navigazione), `shared/i18n/locales.test.ts` (parità chiavi di tutti i `locales/*.json` via `import.meta.glob`, suffissi plurali `_zero|_one|_two|_few|_many|_other` ignorati).
- E2E: `playwright.config.ts` avvia `vite` con `VITE_API_MOCKS=true`; `e2e/orders.spec.ts` usa `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa'])`.

## Trappole Vue

- `useQuery(options)` con un oggetto creato una volta non segue i props: passare `computed(() => queryOptions(...))` o getter con `toValue`.
- `watch(..., { immediate: true })` che chiama il proprio `stop()` va in TDZ: usare un flag.
- Le route `meta` vanno tipizzate con `declare module 'vue-router' { interface RouteMeta { ... } }` (fatto in `shared/auth`, `shared/rbac`, `shared/i18n`, `app/router`).
- Il barrel `features/<f>/index.ts` ri-esporta componenti `.vue` (con CSS): senza `"sideEffects": ["**/*.css", "src/app/main.ts", "src/shared/charts/echarts.ts"]` in `package.json` importare `ORDER_SUBJECT` dal barrel trascinerebbe tutta la feature (VeeValidate incluso) nel bundle iniziale, annullando il lazy loading delle rotte.
- `eslint-plugin-vue` impone nomi multi-parola: il bottone è `AppButton`, gli stati `LoadingState`/`EmptyState`/`ErrorState`.
- Componenti condivisi di `shared/ui`: `QueryState` (loading → errore con Riprova → vuoto → slot; `ErrorState` mostra "non autorizzato" sui 403), `LoadMore` (conteggio annunciato con `aria-live` + "carica altri" finché c'è `nextCursor`), `ConfirmDeleteDialog` (conferma di eliminazione legata a un record: `item` null = chiuso, emette `confirm(item)`), `ForbiddenState` (403 di pagina o di record, URL invariato).
- Testo in `<caption>`/`<td>` sempre via `{{ t(...) }}`: arch_check segnala il testo letterale anche negli attributi `aria-label`/`placeholder`/`title`.
- jsdom non implementa `window.scrollTo` (usato da `scrollBehavior`): stub nel setup dei test.
