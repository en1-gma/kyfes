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
  locales/        it.json · en.json
                  constants.ts (tutte le costanti della feature, foglia) · permissions.ts · routes.ts (orderPaths) · index.ts
src/shared/
  api/            http.ts · api-error.ts · query-client.ts · pagination.ts · index.ts
  auth/           session.schema.ts · session.ts · RequireAuth.tsx
  rbac/           ability.ts · AbilityProvider.tsx · can.ts · RequirePermission.tsx
  i18n/           i18n.ts · formatters.ts · use-locale.ts · locales/{it,en}.json (namespace common)
  charts/         CartesianChart.tsx (unico import di recharts) · ChartFigure.tsx · lazy.tsx · types.ts
  ui/             Button · Spinner · ErrorState · EmptyState · ForbiddenState · ConfirmDialog (<dialog>)
                  QueryState · LoadMore · ConfirmDeleteDialog (usati da OrdersTable, OrdersChart, OrderDetail)
  lib/            sanitize.ts · safe-redirect.ts · safe-url.ts (+ test)
  config/         constants.ts (tutte le costanti trasversali, foglia) · env.ts (unico lettore di import.meta.env) · index.ts
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
// shared/config/constants.ts (ACTIONS e Actions ri-esportati da shared/rbac)
export const ACTIONS = { create: 'create', read: 'read', update: 'update', delete: 'delete', manage: 'manage' } as const;
export type Actions = (typeof ACTIONS)[keyof typeof ACTIONS];
export const SUBJECT = { Order: 'Order' } as const;  // registro dei nomi dei soggetti
// shared/rbac/ability.ts
export interface SubjectRegistry {}               // registro aumentato dalle feature
export type Subjects = 'all' | { [K in keyof SubjectRegistry]: K | (SubjectRegistry[K] & ForcedSubject<K>) }[keyof SubjectRegistry];
export type AppAbility = MongoAbility<[Actions, Subjects]>;
export const buildAbility = (rules) => createMongoAbility<AppAbility>(rules);
```

- Registrazione del soggetto **senza** che `shared` importi da `features` (module augmentation in `features/orders/permissions.ts`):
  ```ts
  // features/orders/constants.ts
  export const ORDER_SUBJECT = SUBJECT.Order;
  export const ORDER_FIELDS = { customerName: 'customerName', status: 'status', total: 'total' } as const;
  // features/orders/permissions.ts
  declare module '@/shared/rbac/ability' { interface SubjectRegistry { Order: Order } }
  export function orderSubject(order: Order) {
    return subject(ORDER_SUBJECT, { ...order });  // copia: la cache resta intatta
  }
  export const ORDER_EDITABLE_FIELDS = [ORDER_FIELDS.customerName, ORDER_FIELDS.status, ORDER_FIELDS.total] as const satisfies readonly (keyof Order)[];
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

- `orders.api.ts` (`ORDERS_ENDPOINT`, `ORDERS_STATS_ENDPOINT` da `constants.ts`): ogni endpoint fa `Schema.parse(data)`; `http.get<unknown>` (mai `any`).
- `create(input: Partial<OrderInput>)` (POST) e `update` (PATCH) ricevono solo i campi scrivibili: `OrderForm` filtra `ORDER_EDITABLE_FIELDS` con `can(ACTIONS.create, ORDER_SUBJECT, field)` o `can(ACTIONS.update, orderSubject(order), field)`; i default dei campi omessi (es. `status`) li applica il server.
- Mutation: create/update → `setQueryData(detail)` + invalidazione di `lists()` e `stats()`. Delete ottimistico con `mutationKey: DELETE_ORDER_KEY` condivisa: `onMutate` (`cancelQueries`, `getQueriesData`, `setQueriesData` che filtra le pagine); `onError` ripristina lo snapshot solo se `isMutating({ mutationKey }) <= 1` (ultima delete in volo), altrimenti `invalidateQueries(lists, refetchType: 'none')`; `onSuccess` rimuove il dettaglio dalla cache; `onSettled` invalida liste e `stats()` solo dall'ultima delete in volo.
- Zustand (`stores/orders-ui.store.ts`) tiene solo filtri/ordinamento, che entrano nella chiave della query.

## i18n (`shared/i18n`)

- Istanza `i18next.createInstance()` + backend custom (`type: 'backend'`) che carica in lazy con `import.meta.glob('./locales/*.json')` (namespace `common`) e `import.meta.glob('../../features/*/locales/*.json')` (namespace = nome cartella della feature). Ogni JSON è un chunk separato.
- `initI18n()` in `main.tsx` prima del render; `react.useSuspense: true` → `<Suspense>` attorno al router e all'`<Outlet/>` del layout.
- Nei componenti: `const { t } = useTranslation(ORDERS_NS)`; chiavi comuni con prefisso `t('common:actions.save')` (il fallback `common` non basta se la chiave esiste anche nel namespace della feature). Plurali i18next (`count_one`/`count_other`, `Intl.PluralRules`).
- Lingua: browser → `VITE_DEFAULT_LOCALE`, poi `changeLocale(session.locale)`; `<html lang>` aggiornato sull'evento `languageChanged`.
- Formatter: `formatDate`, `formatNumber`, `formatCurrency(value)` (valuta `DEFAULT_CURRENCY`), `formatMonth('2026-03')`.
- Messaggi Zod = chiavi i18n (`{ error: VALIDATION_KEYS.required }`, valore `'validation.required'`), tradotte nel form con `t(\`common:${message}\`)`. `COMMON_NS`, `DEFAULT_CURRENCY`, `VALIDATION_KEYS`, `FALLBACK_LOCALE` e `SUPPORTED_LOCALES` stanno in `shared/config/constants.ts`; `shared/i18n` ri-esporta i primi tre.
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

## Costanti (`constants.ts`) e riuso

Ogni costante di dominio è scritta una volta, solo in uno dei due `constants.ts` (regola `constants-location`, schema generale in `SKILL.md` sez. 9.1); gli altri moduli importano e compongono. Entrambi i file sono foglie: `shared/config/constants.ts` non importa nulla, `features/orders/constants.ts` importa solo `SUBJECT` da `@/shared/config/constants`.

| Costante | File | Ri-esportata da (compatibilità) |
|---|---|---|
| `ORDERS_FEATURE`, `ORDERS_NS` | `features/orders/constants.ts` | `index.ts` (solo `ORDERS_NS`) |
| `ORDER_SUBJECT` (= `SUBJECT.Order`), `ORDER_FIELDS` | `features/orders/constants.ts` | `index.ts` |
| `ORDER_STATUS`, `DEFAULT_ORDER_STATUS`, `ORDER_SORT`, `DEFAULT_ORDER_SORT` (+ tipi `OrderStatus`, `OrderSort`) | `features/orders/constants.ts` | `index.ts`; i tipi anche da `model/orders.schema.ts` |
| `ORDERS_ENDPOINT`, `ORDERS_STATS_ENDPOINT` | `features/orders/constants.ts` | `index.ts` |
| `ORDER_ID_PARAM`, `ORDER_ROUTE_SEGMENT` | `features/orders/constants.ts` | (interni: li compone `routes.ts`) |
| `ORDER_DETAIL_MODE` (+ `OrderDetailMode`) | `features/orders/constants.ts` | `index.ts` |
| `ACTIONS` (+ `Actions`), `SUBJECT` | `shared/config/constants.ts` | `shared/rbac` (`ACTIONS`, `Actions`) |
| `AUTH_ENDPOINTS`, `XSRF_COOKIE_NAME`, `XSRF_HEADER_NAME`, `CORRELATION_HEADER` | `shared/config/constants.ts` | `shared/api` (i primi tre) |
| `FLAG_ON`, `FLAG_OFF` | `shared/config/constants.ts` | (usati da `shared/config/env.ts`) |
| `FALLBACK_LOCALE`, `SUPPORTED_LOCALES` | `shared/config/constants.ts` | `shared/config` (`SUPPORTED_LOCALES`) |
| `COMMON_NS`, `VALIDATION_KEYS`, `DEFAULT_CURRENCY` | `shared/config/constants.ts` | `shared/i18n` |
| `BUTTON_VARIANT` (+ `ButtonVariant`), `OPEN_ATTR` | `shared/config/constants.ts` | `shared/ui` (`BUTTON_VARIANT`, `ButtonVariant`) |
| `CHART_DATUM_KEY`, `CHART_VARIANT`, `CHART_COLORS` | `shared/config/constants.ts` | (tipi derivati in `shared/charts/types.ts`) |
| `STYLE`, `TARGET_ATTR` (DOMPurify) | `shared/config/constants.ts` | (usati da `shared/lib/sanitize.ts`) |

Restano fuori da `constants.ts` i valori composti o derivati dalle costanti e i numeri (la regola guarda le stringhe letterali): `orderRoutes`/`orderPaths` (`routes.ts`, da `ORDERS_FEATURE`, `ORDER_ROUTE_SEGMENT`, `ORDER_ID_PARAM`), `orderKeys` (`api/orders.queries.ts`, radice `[ORDERS_FEATURE]`; `DELETE_ORDER_KEY = orderKeys.remove()` privata in `orders.mutations.ts`), `ORDER_EDITABLE_FIELDS` e `orderSubject()` (`permissions.ts`, da `ORDER_FIELDS`), `ORDER_STATUSES` (`model/orders.schema.ts`, `OrderStatusSchema.options`), `DEFAULT_PAGE_SIZE` (`shared/api/pagination.ts`), l'interfaccia `SubjectRegistry` (`shared/rbac/ability.ts`, aumentata dalla feature).

Uso tipico: `<Can I={ACTIONS.update} this={orderSubject(order)}>`, `<RequirePermission action={ACTIONS.read} subject={ORDER_SUBJECT} />` in `app/router.tsx` con `path: orderRoutes.section`, `<NavLink to={orderPaths.list}>`, `useTranslation(ORDERS_NS)`, `can(ACTIONS.update, orderSubject(order), field)` su `ORDER_EDITABLE_FIELDS`. App e pagine importano dal barrel `features/orders/index.ts`; dentro la feature i moduli importano da `../constants`, in `shared/*` da `@/shared/config/constants`. I mock (`mocks/data.ts`, `mocks/handlers.ts`) costruiscono le regole con `ACTIONS.*` e le costanti della feature.

Nuova feature (`customers`):
1. `shared/config/constants.ts`: aggiungi `Customer: 'Customer'` a `SUBJECT` (unica modifica a shared).
2. `features/customers/constants.ts`, foglia (importa al più `@/shared/config/constants`): `CUSTOMERS_FEATURE = 'customers'`, `CUSTOMERS_NS = CUSTOMERS_FEATURE`, `CUSTOMER_SUBJECT = SUBJECT.Customer`, `CUSTOMER_FIELDS`, stati/ordinamenti/default (`CUSTOMER_STATUS`, `CUSTOMER_SORT`, `DEFAULT_CUSTOMER_SORT` + tipi derivati), `CUSTOMERS_ENDPOINT = \`/${CUSTOMERS_FEATURE}\``, `CUSTOMER_ID_PARAM`, `CUSTOMER_ROUTE_SEGMENT`.
3. Gli altri file importano da `../constants` (o `./constants`): `permissions.ts` (augmentation di `SubjectRegistry`, `customerSubject()`, `CUSTOMER_EDITABLE_FIELDS`), `model/customers.schema.ts` (`z.enum` sugli stati), `routes.ts` (`customerRoutes`/`customerPaths`), `api/customers.api.ts`, `customerKeys` con radice `[CUSTOMERS_FEATURE]`; `index.ts` ri-esporta quello che usano app e pagine.

Eccezioni note: `'short'` compare due volte come opzione `Intl` (`timeStyle` in `OrderDetail.tsx`, `month` in `shared/i18n/formatters.ts`), valore di libreria e non di dominio. Metrica attuale dello scaffold (`python3 -B scripts/arch_check.py`): **nessuna violazione, 1 valore duplicato su 100 (1,0%)**, soglia 10%.

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
