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
                  NewOrderPage, ForbiddenPage, NotFoundPage
src/features/orders/  constants.ts (tutte le costanti della feature, foglia; anche nomi e path delle rotte),
                  api/orders.{api,queries,mutations}.ts, components/{OrdersTable,OrderForm,OrderDetail,OrdersChart}.vue,
                  model/orders.schema.ts, locales/{it,en}.json, stores/orders-ui.store.ts (Pinia, solo UI), permissions.ts, index.ts
src/shared/       api/ auth/ rbac/ i18n/ charts/ ui/ lib/ config/{constants.ts (costanti trasversali, foglia), env.ts}
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
// shared/config/constants.ts (tutto ri-esportato da shared/rbac/ability.ts e da @/shared/rbac)
export const ACTION = { create: 'create', read: 'read', update: 'update', delete: 'delete', manage: 'manage' } as const
export type Actions = (typeof ACTION)[keyof typeof ACTION]
export const ACTIONS: readonly Actions[] = Object.values(ACTION)
export const SUBJECT = { Order: 'Order' } as const     // registro: una voce per feature
export const SUBJECTS: readonly SubjectName[] = Object.values(SUBJECT)
// shared/rbac/ability.ts
export type Subjects = SubjectName | ForcedSubject<SubjectName> | 'all'
export type AppAbility = MongoAbility<[Actions, Subjects]>
buildAbility(rules)                                    // createMongoAbility<AppAbility>(rules)
createRbacPlugin(queryClient)                          // app.use(...): abilitiesPlugin + sync con la query della sessione
```

- La sincronizzazione usa `queryClient.getQueryCache().subscribe(...)` sul `queryHash` della sessione: fetch, invalidazione e `clear()` (logout) aggiornano la stessa istanza con `ability.update(rules)`; `@casl/vue` la rende reattiva.
- Nei componenti: `const ability = useAbility()` → `ability.can(ACTION.update, orderSubject(order), ORDER_FIELD.status)`; nel template `v-if="ability.can(ACTION.create, ORDER_SUBJECT)"`. Disponibile anche `<Can :I="ACTION.create" :a="ORDER_SUBJECT">` (tipi del componente generici).
- Feature: `constants.ts` → `ORDER_SUBJECT = SUBJECT.Order`, `ORDER_FIELD = { customerName: 'customerName', status: 'status', total: 'total' } as const` e `ORDER_FIELDS = Object.values(ORDER_FIELD)`; `permissions.ts` → `orderSubject(order) = subject(ORDER_SUBJECT, { ...order })` (copia: CASL marca l'oggetto, i dati in cache restano intatti).
- La rotta `ORDER_ROUTE.edit` controlla solo il tipo (`{ action: ACTION.update, subject: ORDER_SUBJECT }`); `OrderEditPage.vue` controlla il record caricato (`ability.can(ACTION.update, orderSubject(order))`, es. condizioni sullo stato) e altrimenti mostra `ForbiddenState`.
- **Guard `meta.permission`** (`createPermissionGuard`): legge `to.matched[].meta.permission = { action, subject }`, costruisce l'ability dalla sessione e, se negato, restituisce `{ name: FORBIDDEN_ROUTE, params: { pathMatch: to.path.slice(1).split('/') }, query, hash, replace: true }`: si vede la pagina 403 **con l'URL richiesto** (nessun redirect silenzioso). In `app/router/routes.ts` le rotte `ROUTE_NAME.notFound` e `FORBIDDEN_ROUTE` (= `ROUTE_NAME.forbidden`) hanno lo stesso pattern `CATCH_ALL_PATH` (`:pathMatch(.*)*`): l'URL risolve sempre la prima (404), la seconda si raggiunge solo per nome.

```ts
const ordersMeta = { namespaces: [ORDERS_NAMESPACE], titleKey: 'orders.title' }
{ path: ORDER_ROUTE_PATH.create, name: ORDER_ROUTE.create, component: () => import('@/pages/NewOrderPage.vue'),
  meta: { ...ordersMeta, permission: { action: ACTION.create, subject: ORDER_SUBJECT } } }
```

## TanStack Vue Query (`features/orders/api`)

```ts
export const orderKeys = { all: [ORDERS_FEATURE] as const, lists: () => [...], list: (p) => [...orderKeys.lists(), p],
  details: () => [...], detail: (id) => [...orderKeys.details(), id], stats: () => [...orderKeys.all, 'stats'],
  removals: () => [...orderKeys.all, 'remove'] }   // removals(): mutationKey condivisa dalle delete
ordersInfiniteQueryOptions(params) // infiniteQueryOptions({ queryKey: orderKeys.list({...params, limit}),
                                   //   initialPageParam: undefined as string|undefined, getNextPageParam: p => p.nextCursor ?? undefined })
useOrdersInfinite(() => ({ sort: sort.value, status: status.value })) // useInfiniteQuery(computed(() => options)) + orders flat
useOrder(() => props.id)           // useQuery(computed(() => orderQueryOptions(toValue(id))))
useOrderStatsChart()               // dati già pronti per il grafico (formatMonth) — nessuna trasformazione nel chart
```

Mutation: `useCreateOrder`/`useUpdateOrder` (input `Partial<OrderInput>`; `ordersApi.update` = `PATCH`) → `setQueryData(detail)` + `invalidateOrderLists()` (lists + stats). `useDeleteOrder` (`mutationKey: orderKeys.removals()`, condivisa da tutte le delete): `onMutate` → `cancelQueries` + snapshot `getQueriesData(lists)` + `setQueriesData` che filtra l'id; `onError` → ripristino dello snapshot solo se è l'ultima delete in volo (`isMutating({ mutationKey }) > 1` altrimenti), negli altri casi solo `invalidateQueries(lists, { refetchType: 'none' })`; `onSuccess` → `removeQueries(detail)`; `onSettled` → invalidazione solo dall'ultima delete in volo. Le opzioni reattive si passano come `computed(() => options)` o getter: `useQuery(options)` con oggetto statico non reagisce ai cambi di parametri.

## Form (VeeValidate + Zod 4)

```ts
const { defineField, handleSubmit, errors, setErrors } = useForm({
  validationSchema: toTypedSchema(OrderInputSchema), initialValues: { ... } })
const [customerName, customerNameAttrs] = defineField('customerName')
```

I messaggi degli schemi sono chiavi i18n (`z.string().min(1, { error: VALIDATION_MESSAGE.required })`, valore `'common.validation.required'`); il template mostra `message(errors.x)` = `te(x) ? t(x) : x` (i messaggi del server sono già testo). Gli `ApiError.fieldErrors` sui campi del form vanno in `setErrors`; chiavi che non sono campi del form → errore generico.

Permessi per campo: `writable` = i campi di `ORDER_FIELDS` per cui `ability.can(ACTION.create, ORDER_SUBJECT, f)` (o `ability.can(ACTION.update, orderSubject(order), f)`); i non scrivibili sono `readonly` (`status` `:disabled`) con un hint, e `writablePayload(values)` invia solo i campi scrivibili, sia in create sia in update (PATCH).

## i18n (`shared/i18n`)

- `createI18n({ legacy: false, locale: env.DEFAULT_LOCALE, fallbackLocale: FALLBACK_LOCALE, messages: { it: { [COMMON_NS]: commonIt }, en: { [COMMON_NS]: commonEn } } })`: `common` è nel bundle, le feature sono lazy.
- Namespace = chiave di primo livello: `t('orders.list.title')`, `t('common.actions.save')`. Plurali: `t('orders.list.count', n)` con `"nessun ordine | 1 ordine | {count} ordini"`. Mai concatenare: `common.app.pageTitle = "{page} · Gestionale"`.
- La feature espone `ordersLocales = { it: () => import('./locales/it.json'), en: ... }`; `app/providers.ts` chiama `registerNamespace(ORDERS_NAMESPACE, ordersLocales)`; le rotte dichiarano `meta.namespaces` e `router.beforeResolve` chiama `loadNamespaces(...)` (`mergeLocaleMessage`). Così `shared` non importa mai da `features`.
- `setLocale(l)` carica i namespace attivi, imposta `i18n.global.locale.value` e `document.documentElement.lang`. Lingua iniziale (App.vue, una volta): `resolveInitialLocale(session.locale)` → sessione → `navigator.language` → default.
- Componenti: `const { t } = useT()`. Formatter: `formatDate`, `formatNumber`, `formatCurrency(value)` (valuta di default `DEFAULT_CURRENCY`), `formatMonth('2026-03')` (leggono la lingua reattiva).
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

## Costanti (`constants.ts`) e riuso

Ogni costante di dominio è scritta una volta, solo in uno dei due `constants.ts` (regola `constants-location`, schema generale in `SKILL.md` sez. 9.1); gli altri moduli importano e compongono. Entrambi i file sono foglie: `shared/config/constants.ts` non importa nulla, `features/orders/constants.ts` importa solo `SUBJECT` da `@/shared/config/constants`.

| Costante | File | Ri-esportata da (compatibilità) |
|---|---|---|
| `ORDERS_FEATURE`, `ORDERS_NAMESPACE` (= `ORDERS_FEATURE`) | `features/orders/constants.ts` | `index.ts` |
| `ORDER_SUBJECT` (= `SUBJECT.Order`), `ORDER_FIELD`, `ORDER_FIELDS` (+ `OrderField`) | `features/orders/constants.ts` | `index.ts` (tranne `ORDER_FIELDS`) |
| `ORDER_STATUS`, `DEFAULT_ORDER_STATUS`, `ORDER_SORT`, `DEFAULT_ORDER_SORT` (+ `OrderSort`) | `features/orders/constants.ts` | `index.ts` |
| `ORDERS_ENDPOINT`, `ORDERS_STATS_ENDPOINT` | `features/orders/constants.ts` | `index.ts` |
| `ORDER_ROUTE` (nomi di rotta, `list` = `ORDERS_FEATURE`), `ORDER_ROUTE_PATH` (path figli del layout) | `features/orders/constants.ts` | `index.ts` (li usano `app/router/routes.ts` e le pagine) |
| `ACTION`, `ACTIONS` (+ `Actions`), `SUBJECT`, `SUBJECTS` (+ `SubjectName`) | `shared/config/constants.ts` | `shared/rbac/ability.ts`, `@/shared/rbac` |
| `DEFAULT_API_BASE_URL`, `AUTH_ENDPOINTS`, `XSRF_COOKIE_NAME`, `XSRF_HEADER_NAME`, `CORRELATION_HEADER` | `shared/config/constants.ts` | `@/shared/api` (tranne `DEFAULT_API_BASE_URL`) |
| `ENV_FLAG` | `shared/config/constants.ts` | (usato da `shared/config/env.ts`) |
| `SUPPORTED_LOCALES` (+ `Locale`), `FALLBACK_LOCALE` | `shared/config/constants.ts` | `shared/config/env.ts`, `@/shared/i18n` (`SUPPORTED_LOCALES`, `Locale`) |
| `COMMON_NS`, `DEFAULT_CURRENCY`, `VALIDATION_MESSAGE` | `shared/config/constants.ts` | `@/shared/i18n` (`COMMON_NS`, via `i18n.ts`) |
| `ROUTE_NAME` (`notFound`, `forbidden`), `FORBIDDEN_ROUTE`, `CATCH_ALL_PATH` | `shared/config/constants.ts` | `shared/rbac/permission-guard.ts` e `@/shared/rbac` (`FORBIDDEN_ROUTE`) |
| `CHART_KIND`, `CHART_VALUE_FORMAT` (+ tipi), `CHART_PALETTE_VARS`, `CHART_PRIMARY_FALLBACK`, `CHART_FALLBACK_COLORS` | `shared/config/constants.ts` | `shared/charts/types.ts` (`CHART_KIND`, `CHART_VALUE_FORMAT` e tipi) |
| `SANITIZE_FORBID_TAGS`, `SANITIZE_FORBID_ATTR`, `SAFE_URL_PROTOCOLS` | `shared/config/constants.ts` | (usati da `shared/lib/sanitize.ts`, `safe-url.ts`) |

Restano fuori da `constants.ts` i valori composti o derivati e i numeri (la regola guarda le stringhe letterali): `ORDER_STATUSES = OrderStatusSchema.options` (`model/orders.schema.ts`), `orderKeys` (`api/orders.queries.ts`, radice `[ORDERS_FEATURE]`, `removals()` per le delete), `orderSubject()` (`permissions.ts`), `ordersLocales` (`index.ts`), `DEFAULT_PAGE_SIZE` (`shared/api/pagination.ts`). I nomi delle rotte non sono più in `pages/`: quelli della feature sono `ORDER_ROUTE`, quelli generali `ROUTE_NAME`.

Uso tipico: in `<script setup>` le costanti importate sono già visibili al template, senza riesporle: `v-if="ability.can(ACTION.create, ORDER_SUBJECT)"`, `:to="{ name: ORDER_ROUTE.detail, params: { id: order.id } }"`, `:value-format="CHART_VALUE_FORMAT.currency"`, `readOnly(ORDER_FIELD.customerName)`. Nelle rotte `{ path: ORDER_ROUTE_PATH.list, name: ORDER_ROUTE.list, meta: { permission: { action: ACTION.read, subject: ORDER_SUBJECT }, namespaces: [ORDERS_NAMESPACE] } }`. Pagine e app importano dal barrel `@/features/orders`; dentro la feature i moduli importano da `../constants`. Le varianti di `AppButton` sono un'unione di tipo nelle props (`'primary' | 'secondary' | 'danger' | 'link'`), non una costante esportata.

Nuova feature (`customers`):
1. `shared/config/constants.ts`: aggiungi `Customer: 'Customer'` a `SUBJECT` (unica modifica a shared).
2. `features/customers/constants.ts`, foglia (importa al più `@/shared/config/constants`): `CUSTOMERS_FEATURE = 'customers'`, `CUSTOMERS_NAMESPACE = CUSTOMERS_FEATURE`, `CUSTOMER_SUBJECT = SUBJECT.Customer`, `CUSTOMER_FIELD`/`CUSTOMER_FIELDS`, `CUSTOMER_STATUS`/`CUSTOMER_SORT` e default, `CUSTOMERS_ENDPOINT` (`` `/${CUSTOMERS_FEATURE}` ``), `CUSTOMER_ROUTE` (`list: CUSTOMERS_FEATURE`, …) e `CUSTOMER_ROUTE_PATH`.
3. Gli altri file importano da `../constants`: `permissions.ts` (`customerSubject()`), `model/customers.schema.ts` (`z.enum(CUSTOMER_STATUS)`), `api/customers.api.ts`, `customerKeys` con radice `[CUSTOMERS_FEATURE]`, store e componenti; `index.ts` ri-esporta costanti e `customersLocales`; `app/router/routes.ts` aggiunge le rotte con `CUSTOMER_ROUTE`/`CUSTOMER_ROUTE_PATH` e `app/providers.ts` registra il namespace.

Eccezioni e debiti noti (metrica attuale dello scaffold con `python3 -B scripts/arch_check.py`: **nessuna violazione, 8 valori duplicati su 116 (6,9%)**, soglia 10%, il margine più stretto tra gli scaffold):
- nomi degli eventi (`'cancel'`, `'confirm'`, `'close'`, `'retry'`): sono il contratto tipizzato di `defineEmits<{ cancel: [] }>()` (macro del compilatore SFC) e devono coincidere con `@cancel` nel template del padre, quindi `emit('cancel')`/`$emit('retry')` restano letterali (`OrderForm.vue`, `ConfirmDialog.vue`, `ConfirmDeleteDialog.vue`, `ErrorState.vue`, `QueryState.vue`);
- omonimi di libreria: `'post'`/`'patch'` (metodo di `sendParsed` in `orders.api.ts` e `shared/api/http.ts`, `flush: 'post'` del `watch` in `ConfirmDialog.vue`), `'button'`/`'style'` (tipo di `AppButton` e `SANITIZE_FORBID_TAGS`/`SANITIZE_FORBID_ATTR` di DOMPurify in `shared/config/constants.ts`);
- `'orders'` è scritto una sola volta (`ORDERS_FEATURE` in `features/orders/constants.ts`): `ORDERS_NAMESPACE`, `ORDER_ROUTE.list`, `ORDER_ROUTE_PATH.list` e la radice di `orderKeys` ne derivano. Una nuova feature fa lo stesso con `<F>_FEATURE` (sez. 9.1), altrimenti ogni feature aggiunge un duplicato e la soglia si supera presto.

## Trappole Vue

- `useQuery(options)` con un oggetto creato una volta non segue i props: passare `computed(() => queryOptions(...))` o getter con `toValue`.
- `watch(..., { immediate: true })` che chiama il proprio `stop()` va in TDZ: usare un flag.
- Le route `meta` vanno tipizzate con `declare module 'vue-router' { interface RouteMeta { ... } }` (fatto in `shared/auth`, `shared/rbac`, `shared/i18n`, `app/router`).
- Il barrel `features/<f>/index.ts` ri-esporta componenti `.vue` (con CSS): senza `"sideEffects": ["**/*.css", "src/app/main.ts", "src/shared/charts/echarts.ts"]` in `package.json` importare `ORDER_SUBJECT` dal barrel trascinerebbe tutta la feature (VeeValidate incluso) nel bundle iniziale, annullando il lazy loading delle rotte.
- `eslint-plugin-vue` impone nomi multi-parola: il bottone è `AppButton`, gli stati `LoadingState`/`EmptyState`/`ErrorState`.
- Componenti condivisi di `shared/ui`: `QueryState` (loading → errore con Riprova → vuoto → slot; `ErrorState` mostra "non autorizzato" sui 403), `LoadMore` (conteggio annunciato con `aria-live` + "carica altri" finché c'è `nextCursor`), `ConfirmDeleteDialog` (conferma di eliminazione legata a un record: `item` null = chiuso, emette `confirm(item)`), `ForbiddenState` (403 di pagina o di record, URL invariato).
- Testo in `<caption>`/`<td>` sempre via `{{ t(...) }}`: arch_check segnala il testo letterale anche negli attributi `aria-label`/`placeholder`/`title`.
- jsdom non implementa `window.scrollTo` (usato da `scrollBehavior`): stub nel setup dei test.
