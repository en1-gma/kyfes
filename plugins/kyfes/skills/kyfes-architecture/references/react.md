# kyfes — React (Vite + React Router)

Scaffold di riferimento: `templates/scaffold/react/`. Le regole sono quelle di `SKILL.md`; qui ci sono i nomi esatti di file e API per React. In caso di dubbio su un'API, il codice dello scaffold è la fonte di verità (verificato con lint, typecheck, test, build ed e2e+axe).

## Versioni (npm `latest` a ottobre 2026)

| Libreria | Versione | Note |
|---|---|---|
| react / react-dom | ^19.3 | `<title>` nei componenti (hoisting nativo) |
| vite / @vitejs/plugin-react | ^8.3 / ^6.1 | Rolldown; `build.sourcemap: false` |
| react-router | ^8.4 | `react-router-dom` non esiste più: `react-router` + `react-router/dom` |
| @tanstack/react-query | ^5.104 | |
| axios | ^1.20 | |
| @casl/ability / @casl/react | ^7.0 | `AbilityProvider` + `useAbility` + `Can` esportati da `@casl/react` |
| i18next / react-i18next | ^26.5 / ^17.1 | v26: rimossi `initImmediate`, `interpolation.format` |
| recharts | ^3.10 | prop `responsive` sul chart (niente `ResponsiveContainer`) |
| zustand | ^5.0 | solo stato UI |
| zod | ^4.6 | `z.uuid()`, `z.iso.datetime()`, `z.email()`, `{ error: '…' }`, `z.prettifyError`, `z.flattenError` |
| react-hook-form / @hookform/resolvers | ^7.90 / **^5.9** | resolvers 6.0.0 non si installa senza `--legacy-peer-deps` (ERESOLVE su peer opzionali `effect`/`@typeschema`): si usa la 5.x, compatibile con zod 4 |
| dompurify | ^3.4 | |
| vitest / jsdom | ^5.0 / ^30 | v5: `clearMocks` attivo di default |
| msw | ^3.0 | `onUnhandledRequest` → **`onUnhandledFrame`** |
| @testing-library/react / jest-dom | ^16.3 / ^7.0 | setup: `import '@testing-library/jest-dom/vitest'` |
| @playwright/test / @axe-core/playwright | ^1.64 / ^4.14 | |
| typescript | **~6.0.3** | TS 7 escluso: `typescript-eslint` 8.x richiede `typescript <6.1.0` |
| eslint / typescript-eslint | ^10.13 / ^8.71 | `eslint-plugin-jsx-a11y` (6.10) non supporta ESLint 10: escluso, l'accessibilità è coperta da axe in Playwright |

## Mappa dei file

```text
src/app/          main.tsx (bootstrap: MSW opzionale → initI18n → render), App.tsx, providers.tsx,
                  router.tsx (rotte + guard), lazy-page.ts, AppLayout.tsx (nav, lingua, logout),
                  RouteErrorBoundary.tsx, styles.css (token CSS)
src/pages/        OrdersPage, OrderDetailPage, OrderEditPage, NewOrderPage, ForbiddenPage, NotFoundPage
src/features/orders/
  api/            orders.api.ts · orders.queries.ts · orders.mutations.ts
  components/     OrdersTable · OrderForm · OrderDetail · OrdersChart · OrderStatusBadge
  model/          orders.schema.ts        stores/ orders-ui.store.ts (Zustand, filtri)
  locales/        it.json · en.json       permissions.ts · routes.ts (orderPaths) · index.ts
src/shared/
  api/            http.ts · api-error.ts · query-client.ts · pagination.ts · index.ts
  auth/           session.schema.ts · session.ts · RequireAuth.tsx
  rbac/           ability.ts · AbilityProvider.tsx · can.ts · RequirePermission.tsx
  i18n/           i18n.ts · formatters.ts · use-locale.ts · locales/{it,en}.json (namespace common)
  charts/         CartesianChart.tsx (unico import di recharts) · ChartFigure.tsx · lazy.tsx · types.ts
  ui/             Button · Spinner · ErrorState · EmptyState · ForbiddenState · ConfirmDialog (<dialog>)
                  QueryState · LoadMore · ConfirmDeleteDialog (usati da OrdersTable, OrdersChart, OrderDetail)
  lib/            sanitize.ts · safe-redirect.ts · safe-url.ts (+ test)
  config/         env.ts (unico lettore di import.meta.env)
src/mocks/        data.ts · handlers.ts · browser.ts · node.ts      src/test/ setup.ts · render.tsx
e2e/orders.spec.ts · playwright.config.ts · deploy/security-headers.conf · vite.config.ts
```

## Client HTTP e XSRF (`shared/api/http.ts`)

```ts
export const http = axios.create({
  baseURL: env.API_BASE_URL,            // "/api": stessa origine, proxy Vite in dev
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: shouldSendXsrf,        // funzione: true solo se baseURL+url è same-origin
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});
configureHttp({ refreshOnUnauthorized: true, onUnauthorized: () => login(), onForbidden: () => invalidateSession(qc) });
```

- axios 1.20 invia l'header solo se `withXSRFToken === true` **oppure** è `undefined` e l'URL è same-origin; la funzione rende esplicito il confine anche con URL assoluti.
- Interceptor di risposta: le cancellazioni (`axios.isCancel`: `AbortSignal`, query smontata) sono rilanciate così come sono; ogni altro errore diventa `ApiError { status, code, message, correlationId, fieldErrors }` (`toApiError`; `correlationId` dal body o dall'header `x-correlation-id`; `status: 0` per rete/timeout). 403 → `onForbidden`.
- 401 → refresh **single-flight** (`POST /auth/refresh`, una promessa condivisa) e una sola ripetizione (`_kyfesRetried`). Un interceptor di richiesta salva in `_kyfesSessionGen` il contatore dei refresh riusciti: una richiesta partita prima di un refresh già concluso viene ripetuta senza nuovo refresh. Se il refresh fallisce, `onUnauthorized` è chiamato **una sola volta** per tutte le richieste in attesa (flag azzerato da un refresh riuscito o da `configureHttp`). Gli endpoint `/auth/refresh|login|logout` (confronto sul path senza query/hash) sono esclusi.
- `query-client.ts`: `createQueryClient(overrides)` con `staleTime: 30_000`, `retry: shouldRetry` (solo `ApiError` con `status` 0 o >= 500, max 2; mai su 4xx, `ZodError` o altri errori), mutation senza retry.
- `pagination.ts`: `pageSchema(item)` → `{ items, nextCursor: string|null, limit }`, `PageParams { limit, cursor?, sort? }`, `getNextCursor`.

## Sessione (`shared/auth`)

```ts
export const sessionQueryOptions = queryOptions({
  queryKey: sessionKeys.me(),                       // ['session', 'me']
  queryFn: async ({ signal }) => SessionSchema.parse((await http.get('/auth/me', { signal })).data),
  staleTime: 5 * 60_000, retry: false,
});
login(returnTo)   // window.location.assign(`${API}/auth/login?returnTo=${encodeURIComponent(safeRedirect(returnTo))}`)
logout(qc)        // POST /auth/logout → qc.clear() → redirect
<RequireAuth />   // elemento di rotta: Spinner, ErrorState, oppure <Outlet/>; su 401 chiama login()
```

`SessionSchema = { user: { id, name, email }, rules: RawRule[], locale? }`. `useCurrentSession()` legge la cache (dentro `RequireAuth` è sempre valorizzata).

## RBAC (`shared/rbac`)

```ts
export const ACTIONS = { create: 'create', read: 'read', update: 'update', delete: 'delete', manage: 'manage' } as const;
export type Actions = (typeof ACTIONS)[keyof typeof ACTIONS];
export interface SubjectRegistry {}               // registro aumentato dalle feature
export type Subjects = 'all' | { [K in keyof SubjectRegistry]: K | (SubjectRegistry[K] & ForcedSubject<K>) }[keyof SubjectRegistry];
export type AppAbility = MongoAbility<[Actions, Subjects]>;
export const buildAbility = (rules) => createMongoAbility<AppAbility>(rules);
```

- Registrazione del soggetto **senza** che `shared` importi da `features` (module augmentation in `features/orders/permissions.ts`):
  ```ts
  export const ORDER_SUBJECT = 'Order' as const;
  declare module '@/shared/rbac/ability' { interface SubjectRegistry { Order: Order } }
  export function orderSubject(order: Order) {
    return subject(ORDER_SUBJECT, { ...order });  // copia: la cache resta intatta
  }
  export const ORDER_FIELDS = { customerName: 'customerName', status: 'status', total: 'total' } as const satisfies Record<string, keyof Order>;
  ```
- `AbilityProvider` (in `app/providers.tsx`) costruisce l'Ability con `useMemo` sulle `rules` della sessione: quando `/auth/me` viene rifatta cambia l'istanza e tutto si ri-renderizza. Prop `ability` per i test.
- `Can` è il `Can` di `@casl/react` tipizzato su `AppAbility` (`CanProps<AppAbility>`), legge il contesto: `<Can I={ACTIONS.create} a={ORDER_SUBJECT}>`, `<Can I={ACTIONS.update} this={orderSubject(order)}>`. `useCan()` restituisce `ability.can` legato: `can(ACTIONS.update, orderSubject(order), ORDER_FIELDS.status)`.
- `<RequirePermission action={ACTIONS.read} subject={ORDER_SUBJECT} />` come `element` di una rotta: `<Outlet/>` oppure `ForbiddenState` (403 visibile, nessun redirect).

## TanStack Query (`features/orders/api`)

```ts
export const orderKeys = {
  all: [ORDERS_FEATURE] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (f: OrderListFilters) => [...orderKeys.lists(), f] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  remove: () => [...orderKeys.all, 'remove'] as const,   // mutationKey condivisa dalle delete
};
infiniteQueryOptions({
  queryKey: orderKeys.list({ limit, sort, status }),
  queryFn: ({ pageParam, signal }) => ordersApi.list({ limit, sort, status, cursor: pageParam }, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: getNextCursor,
});
```

- `orders.api.ts`: ogni endpoint fa `Schema.parse(data)`; `http.get<unknown>` (mai `any`).
- `create(input: Partial<OrderInput>)` (POST) e `update` (PATCH) ricevono solo i campi scrivibili: `OrderForm` filtra `ORDER_EDITABLE_FIELDS` con `can(ACTIONS.create, ORDER_SUBJECT, field)` o `can(ACTIONS.update, orderSubject(order), field)`; i default dei campi omessi (es. `status`) li applica il server.
- Mutation: create/update → `setQueryData(detail)` + invalidazione di `lists()` e `stats()`. Delete ottimistico con `mutationKey: DELETE_ORDER_KEY` condivisa: `onMutate` (`cancelQueries`, `getQueriesData`, `setQueriesData` che filtra le pagine); `onError` ripristina lo snapshot solo se `isMutating({ mutationKey }) <= 1` (ultima delete in volo), altrimenti `invalidateQueries(lists, refetchType: 'none')`; `onSuccess` rimuove il dettaglio dalla cache; `onSettled` invalida liste e `stats()` solo dall'ultima delete in volo.
- Zustand (`stores/orders-ui.store.ts`) tiene solo filtri/ordinamento, che entrano nella chiave della query.

## i18n (`shared/i18n`)

- Istanza `i18next.createInstance()` + backend custom (`type: 'backend'`) che carica in lazy con `import.meta.glob('./locales/*.json')` (namespace `common`) e `import.meta.glob('../../features/*/locales/*.json')` (namespace = nome cartella della feature). Ogni JSON è un chunk separato.
- `initI18n()` in `main.tsx` prima del render; `react.useSuspense: true` → `<Suspense>` attorno al router e all'`<Outlet/>` del layout.
- Nei componenti: `const { t } = useTranslation(ORDERS_NS)`; chiavi comuni con prefisso `t('common:actions.save')` (il fallback `common` non basta se la chiave esiste anche nel namespace della feature). Plurali i18next (`count_one`/`count_other`, `Intl.PluralRules`).
- Lingua: browser → `VITE_DEFAULT_LOCALE`, poi `changeLocale(session.locale)`; `<html lang>` aggiornato sull'evento `languageChanged`.
- Formatter: `formatDate`, `formatNumber`, `formatCurrency(value)` (valuta `DEFAULT_CURRENCY`), `formatMonth('2026-03')`.
- Messaggi Zod = chiavi i18n (`{ error: VALIDATION_KEYS.required }`, valore `'validation.required'`), tradotte nel form con `t(\`common:${message}\`)`.
- Test di parità: `shared/i18n/locales.test.ts` confronta le chiavi di ogni namespace in tutte le lingue, ignorando i suffissi plurali (`_zero|_one|_two|_few|_many|_other`).

## Grafici (`shared/charts`)

`BarChart` e `LineChart` (da `lazy.tsx`, `React.lazy` + `Suspense`) caricano `CartesianChart.tsx`, l'unico file che importa `recharts` (`ComposedChart responsive`, `Bar`/`Line`, palette `var(--chart-n)`, `Tooltip formatter` Intl, `accessibilityLayer={false}` perché il contenitore è `role="img"` con `aria-label`). `ChartFigure` aggiunge `figcaption`, descrizione (`aria-describedby`) e tabella dati in `<details>`. Props: `{ title, description?, seriesLabel, data: {label, value}[], formatValue? }`; i dati arrivano già aggregati dall'API (`/orders/stats`).

## Rotte e guard (`app/router.tsx`)

`createBrowserRouter(routes)` + `<RouterProvider>` importato da `react-router/dom`. Radice: `element: <RequireAuth/>`, `errorElement`, `hydrateFallbackElement: <Spinner/>` (senza, React Router avvisa al primo caricamento delle rotte lazy). `orders` → `RequirePermission read Order`; `orders/new` → `create Order`; `orders/:orderId/edit` → `update Order` sul tipo + controllo sul record in `OrderDetail`. Pagine con `lazy: page(() => import('@/pages/X'))`. `NotFoundPage` è statica (usata anche dall'error boundary).

## Sicurezza del deploy

- `deploy/security-headers.conf` (nginx): CSP `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`, HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP; `/assets/` immutable 1 anno, `index.html` no-cache, `.map` e `mockServiceWorker.js` → 404. Gli header vanno ripetuti in ogni `location` con `add_header`.
- Nessun nonce necessario: Vite produce solo script esterni con hash. Lo `style` di React passa da CSSOM e non richiede `'unsafe-inline'`.
- `vite.config.ts`: proxy `/api` → `API_PROXY_TARGET` (variabile senza prefisso `VITE_`, non finisce nel bundle).

## Test

- `vite.config.ts` → `test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'], fsModuleCache: false }` (la cache persistente delle trasformazioni conserva risultati vecchi di `import.meta.glob`: i locales di una nuova feature non verrebbero trovati).
- `setup.ts`: `server.listen({ onUnhandledFrame: 'error' })`, `initI18n('it')` + `i18n.loadNamespaces([COMMON_NS, ORDERS_NS])`, `resetHandlers` + `db.reset()` dopo ogni test, stub di `ResizeObserver` per Recharts.
- `renderWithProviders(ui, { user: 'manager' | 'viewer' | 'operator' })`: QueryClient di test (`retry: false`, `staleTime: Infinity`) con la sessione già in cache, `AbilityProvider`, i18n, `createMemoryRouter`.
- Mock: `apiError(status, code, message)` restituisce `{ code, message, correlationId }` + header; override per test con `server.use(http.get('/api/orders', () => apiError(500, …)))`. Gli handler POST/PATCH applicano le regole CASL dell'utente mock: tipo, record (condizioni) e ogni campo del body (`deniedFields` → 403); in create `status` ha default `DEFAULT_ORDER_STATUS`.
- RBAC: la stessa vista con `manager` mostra Nuovo/Modifica/Elimina, con `viewer` no; `operator` verifica condizioni sul record (`{ [ORDER_FIELDS.status]: ORDER_STATUS.draft }`), permessi per campo (stato in sola lettura) e che create/update non inviino mai `status`.
- Coperti anche: refresh 401 (richiesta lenta partita prima del refresh, `onUnauthorized` una volta, cancellazioni), `shouldRetry` su `ZodError`/`TypeError`, delete concorrenti con errore, `safeRedirect` su percorsi normalizzati.
- e2e: `playwright.config.ts` avvia `npm run dev` con `VITE_API_MOCKS=true`; `AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])`.

## Costanti e riuso (`constant-reuse`)

Ogni valore di dominio è scritto una volta e importato (schema generale in `SKILL.md` sez. 9.1). Dove vive nello scaffold:

| Valore | Costante | File |
|---|---|---|
| azioni CASL | `ACTIONS` (`ACTIONS.update`, mai `'update'`) | `shared/rbac/ability.ts` |
| registro soggetti | `interface SubjectRegistry` (module augmentation dalla feature) | `shared/rbac/ability.ts` |
| soggetto e campi | `ORDER_SUBJECT`, `ORDER_FIELDS`, `ORDER_EDITABLE_FIELDS`, `orderSubject()` | `features/orders/permissions.ts` |
| nome feature e namespace | `ORDERS_FEATURE = 'orders'`, `ORDERS_NS = ORDERS_FEATURE`; comune `COMMON_NS` | `model/orders.feature.ts`; `shared/i18n/i18n.ts` |
| stati, ordinamenti, default | `ORDER_STATUS`, `ORDER_STATUSES`, `DEFAULT_ORDER_STATUS`, `ORDER_SORT`, `DEFAULT_ORDER_SORT` | `model/orders.schema.ts` |
| modalità del dettaglio | `ORDER_DETAIL_MODE` | `components/order-detail-mode.ts` |
| percorsi UI | `orderRoutes` (relativi, per il router) e `orderPaths` (assoluti, per i link), derivati da `ORDERS_FEATURE` | `features/orders/routes.ts` |
| endpoint | `ORDERS_ENDPOINT = '/orders'`; `AUTH_ENDPOINTS`, `XSRF_COOKIE_NAME`/`XSRF_HEADER_NAME` | `api/orders.api.ts`; `shared/api/http.ts` |
| query/mutation key | `orderKeys` (radice `[ORDERS_FEATURE]`, `remove()` per `DELETE_ORDER_KEY`) | `api/orders.queries.ts` |
| trasversali | `BUTTON_VARIANT` (`shared/ui/button-variant.ts`), `CHART_VARIANT`/`CHART_DATUM_KEY` (`shared/charts/types.ts`), `DEFAULT_CURRENCY` (`shared/i18n/formatters.ts`), `VALIDATION_KEYS` (`shared/i18n/validation.ts`), `SUPPORTED_LOCALES` (`shared/config/env.ts`), `DEFAULT_PAGE_SIZE` (`shared/api/pagination.ts`) | `shared/*` |

Uso tipico: `<Can I={ACTIONS.update} this={orderSubject(order)}>`, `<RequirePermission action={ACTIONS.read} subject={ORDER_SUBJECT} />` in `app/router.tsx` con `path: orderRoutes.section`, `<NavLink to={orderPaths.list}>`, `useTranslation(ORDERS_NS)`, `can(ACTIONS.update, orderSubject(order), field)` su `ORDER_EDITABLE_FIELDS`. App e pagine importano tutto dal barrel `features/orders/index.ts`; i mock (`mocks/data.ts`) costruiscono le regole con `ACTIONS.*` e `ORDER_SUBJECT`. Il flag di env `'true'` è la costante privata `FLAG_ON` di `shared/config/env.ts`.

Nuova feature (`customers`): `model/customers.feature.ts` con `CUSTOMERS_FEATURE` e `CUSTOMERS_NS`; `permissions.ts` con `CUSTOMER_SUBJECT = 'Customer' as const`, augmentation di `SubjectRegistry` e `CUSTOMER_FIELDS`; stati/ordinamenti in `model/customers.schema.ts`; `routes.ts` con `customerRoutes`/`customerPaths` derivati da `CUSTOMERS_FEATURE`; `CUSTOMERS_ENDPOINT` in `api/customers.api.ts`; `customerKeys` con radice `[CUSTOMERS_FEATURE]`; tutto riesportato da `index.ts`.

Eccezioni note: `'short'` compare due volte come opzione `Intl` (`timeStyle` in `OrderDetail.tsx`, `month` in `shared/i18n/formatters.ts`), valore di libreria e non di dominio. Metrica attuale dello scaffold (`arch_check.py`): **1 valore duplicato su 100 (1,0%)**, soglia 10%.

## Trappole

- **Tracked props di TanStack Query**: il risultato di `useQuery`/`useInfiniteQuery` notifica solo le proprietà già lette. Nei test con `renderHook`, leggere `data` nel primo `waitFor`, altrimenti il re-render dopo un'invalidazione non arriva.
- **Barrel e code splitting**: `"sideEffects": ["**/*.css", "./src/app/main.tsx"]` in `package.json`, altrimenti Rolldown porta nel chunk iniziale tutti i componenti esportati da `features/<f>/index.ts` (importato da router/layout per `orderPaths`/`ORDER_SUBJECT`). Un modulo con effetti a livello di modulo va aggiunto all'elenco.
- **Campo in sola lettura con React Hook Form**: `disabled` (attributo o opzione di `register`) rende il valore `undefined` e fa fallire lo schema; si mostra un `<input readOnly>` non registrato e il payload contiene solo i campi scrivibili.
- **`safeRedirect`**: `new URL` risolve i dot segment (`/.//evil.example` → `//evil.example`, protocol-relative); il risultato normalizzato e il pathname decodificato (`decodeURIComponent`) sono ricontrollati: `//…` o `\` → fallback.
- **MSW 3**: opzione `onUnhandledFrame`; `delay()` senza argomenti in Node è immediato; il worker si avvia solo con `import.meta.env.DEV && env.API_MOCKS` (costante di build: il ramo sparisce dal bundle di produzione). `VITE_MOCK_USER` è letto solo in `src/mocks/browser.ts`.
- **CASL `subject()`** marca l'oggetto: passare una copia (`{ ...order }`) per non toccare i dati in cache.
- **`Can` di `@casl/react` 7** è generico ma in JSX non si può passare il tipo: usare il `Can` ri-esportato da `shared/rbac`. Hook e `Can` stanno in `can.ts` (non `.tsx`) per la regola `react-refresh/only-export-components`.
- **DOMPurify** elimina `target` per default: `ADD_ATTR: ['target']` + hook `afterSanitizeAttributes` che forza `rel="noopener noreferrer"`.
- **arch_check `hardcoded-text`** segnala in `.tsx` i tipi come `=> Promise<PageModule>` (il pattern `>…<` vede testo): helper tipizzati di questo genere stanno in file `.ts` (es. `app/lazy-page.ts`).
- `import.meta.glob` di `shared/i18n` verso `features/*/locales` è un caricamento per convenzione (nessun import di codice): non viola la direzione dei livelli.
