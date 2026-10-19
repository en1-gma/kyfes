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
- Interceptor di risposta: ogni errore diventa `ApiError { status, code, message, correlationId, fieldErrors }` (`toApiError`; `correlationId` dal body o dall'header `x-correlation-id`; `status: 0` per rete/timeout). 401 → refresh **single-flight** (`POST /auth/refresh`, una promessa condivisa) e una sola ripetizione (`_kyfesRetried`), poi `onUnauthorized`. Gli endpoint `/auth/refresh|login|logout` sono esclusi dal retry. 403 → `onForbidden`.
- `query-client.ts`: `createQueryClient(overrides)` con `staleTime: 30_000`, `retry: shouldRetry` (mai su 4xx, max 2 su 5xx/rete), mutation senza retry.
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
export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';
export interface SubjectRegistry {}               // registro aumentato dalle feature
export type Subjects = 'all' | { [K in keyof SubjectRegistry]: K | (SubjectRegistry[K] & ForcedSubject<K>) }[keyof SubjectRegistry];
export type AppAbility = MongoAbility<[Actions, Subjects]>;
export const buildAbility = (rules) => createMongoAbility<AppAbility>(rules);
```

- Registrazione del soggetto **senza** che `shared` importi da `features` (module augmentation in `features/orders/permissions.ts`):
  ```ts
  declare module '@/shared/rbac/ability' { interface SubjectRegistry { Order: Order } }
  export const orderSubject = (o: Order) => subject('Order', { ...o });  // copia: la cache resta intatta
  ```
- `AbilityProvider` (in `app/providers.tsx`) costruisce l'Ability con `useMemo` sulle `rules` della sessione: quando `/auth/me` viene rifatta cambia l'istanza e tutto si ri-renderizza. Prop `ability` per i test.
- `Can` è il `Can` di `@casl/react` tipizzato su `AppAbility` (`CanProps<AppAbility>`), legge il contesto: `<Can I="create" a="Order">`, `<Can I="update" this={orderSubject(order)}>`. `useCan()` restituisce `ability.can` legato: `can('update', orderSubject(order), 'status')`.
- `<RequirePermission action="read" subject="Order" />` come `element` di una rotta: `<Outlet/>` oppure `ForbiddenState` (403 visibile, nessun redirect).

## TanStack Query (`features/orders/api`)

```ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (f: OrderListFilters) => [...orderKeys.lists(), f] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
};
infiniteQueryOptions({
  queryKey: orderKeys.list({ limit, sort, status }),
  queryFn: ({ pageParam, signal }) => ordersApi.list({ limit, sort, status, cursor: pageParam }, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: getNextCursor,
});
```

- `orders.api.ts`: ogni endpoint fa `Schema.parse(data)`; `http.get<unknown>` (mai `any`).
- Mutation: create/update → `setQueryData(detail)` + invalidazione di `lists()` e `stats()`; delete → `onMutate` (`cancelQueries`, `getQueriesData`, `setQueriesData` che filtra le pagine), `onError` ripristina, `onSettled` invalida.
- Zustand (`stores/orders-ui.store.ts`) tiene solo filtri/ordinamento, che entrano nella chiave della query.

## i18n (`shared/i18n`)

- Istanza `i18next.createInstance()` + backend custom (`type: 'backend'`) che carica in lazy con `import.meta.glob('./locales/*.json')` (namespace `common`) e `import.meta.glob('../../features/*/locales/*.json')` (namespace = nome cartella della feature). Ogni JSON è un chunk separato.
- `initI18n()` in `main.tsx` prima del render; `react.useSuspense: true` → `<Suspense>` attorno al router e all'`<Outlet/>` del layout.
- Nei componenti: `const { t } = useTranslation('orders')`; chiavi comuni con prefisso `t('common:actions.save')` (il fallback `common` non basta se la chiave esiste anche nel namespace della feature). Plurali i18next (`count_one`/`count_other`, `Intl.PluralRules`).
- Lingua: browser → `VITE_DEFAULT_LOCALE`, poi `changeLocale(session.locale)`; `<html lang>` aggiornato sull'evento `languageChanged`.
- Formatter: `formatDate`, `formatNumber`, `formatCurrency(value, 'EUR')`, `formatMonth('2026-03')`.
- Messaggi Zod = chiavi i18n (`{ error: 'validation.required' }`), tradotte nel form con `t(\`common:${message}\`)`.
- Test di parità: `shared/i18n/locales.test.ts` confronta le chiavi di ogni namespace in tutte le lingue.

## Grafici (`shared/charts`)

`BarChart` e `LineChart` (da `lazy.tsx`, `React.lazy` + `Suspense`) caricano `CartesianChart.tsx`, l'unico file che importa `recharts` (`ComposedChart responsive`, `Bar`/`Line`, palette `var(--chart-n)`, `Tooltip formatter` Intl, `accessibilityLayer={false}` perché il contenitore è `role="img"` con `aria-label`). `ChartFigure` aggiunge `figcaption`, descrizione (`aria-describedby`) e tabella dati in `<details>`. Props: `{ title, description?, seriesLabel, data: {label, value}[], formatValue? }`; i dati arrivano già aggregati dall'API (`/orders/stats`).

## Rotte e guard (`app/router.tsx`)

`createBrowserRouter(routes)` + `<RouterProvider>` importato da `react-router/dom`. Radice: `element: <RequireAuth/>`, `errorElement`, `hydrateFallbackElement: <Spinner/>` (senza, React Router avvisa al primo caricamento delle rotte lazy). `orders` → `RequirePermission read Order`; `orders/new` → `create Order`; `orders/:orderId/edit` → `update Order` sul tipo + controllo sul record in `OrderDetail`. Pagine con `lazy: page(() => import('@/pages/X'))`. `NotFoundPage` è statica (usata anche dall'error boundary).

## Sicurezza del deploy

- `deploy/security-headers.conf` (nginx): CSP `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`, HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP; `/assets/` immutable 1 anno, `index.html` no-cache, `.map` e `mockServiceWorker.js` → 404. Gli header vanno ripetuti in ogni `location` con `add_header`.
- Nessun nonce necessario: Vite produce solo script esterni con hash. Lo `style` di React passa da CSSOM e non richiede `'unsafe-inline'`.
- `vite.config.ts`: proxy `/api` → `API_PROXY_TARGET` (variabile senza prefisso `VITE_`, non finisce nel bundle).

## Test

- `vite.config.ts` → `test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] }`.
- `setup.ts`: `server.listen({ onUnhandledFrame: 'error' })`, `initI18n('it')` + `loadNamespaces(['common','orders'])`, `resetHandlers` + `db.reset()` dopo ogni test, stub di `ResizeObserver` per Recharts.
- `renderWithProviders(ui, { user: 'manager' | 'viewer' | 'operator' })`: QueryClient di test (`retry: false`, `staleTime: Infinity`) con la sessione già in cache, `AbilityProvider`, i18n, `createMemoryRouter`.
- Mock: `apiError(status, code, message)` restituisce `{ code, message, correlationId }` + header; override per test con `server.use(http.get('/api/orders', () => apiError(500, …)))`.
- RBAC: la stessa vista con `manager` mostra Nuovo/Modifica/Elimina, con `viewer` no; `operator` verifica condizioni sul record (`status: 'draft'`) e permessi per campo (stato in sola lettura).
- e2e: `playwright.config.ts` avvia `npm run dev` con `VITE_API_MOCKS=true`; `AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])`.

## Trappole

- **Tracked props di TanStack Query**: il risultato di `useQuery`/`useInfiniteQuery` notifica solo le proprietà già lette. Nei test con `renderHook`, leggere `data` nel primo `waitFor`, altrimenti il re-render dopo un'invalidazione non arriva.
- **Barrel e code splitting**: `"sideEffects": ["**/*.css", "./src/app/main.tsx"]` in `package.json`, altrimenti Rolldown porta nel chunk iniziale tutti i componenti esportati da `features/<f>/index.ts` (importato da router/layout per `orderPaths`/`ORDER_SUBJECT`). Un modulo con effetti a livello di modulo va aggiunto all'elenco.
- **Campo in sola lettura con React Hook Form**: `disabled` (attributo o opzione di `register`) rende il valore `undefined` e fa fallire lo schema; si mostra un `<input readOnly>` non registrato e si toglie il campo dal payload.
- **MSW 3**: opzione `onUnhandledFrame`; `delay()` senza argomenti in Node è immediato; il worker si avvia solo con `import.meta.env.DEV && env.API_MOCKS` (costante di build: il ramo sparisce dal bundle di produzione). `VITE_MOCK_USER` è letto solo in `src/mocks/browser.ts`.
- **CASL `subject()`** marca l'oggetto: passare una copia (`{ ...order }`) per non toccare i dati in cache.
- **`Can` di `@casl/react` 7** è generico ma in JSX non si può passare il tipo: usare il `Can` ri-esportato da `shared/rbac`. Hook e `Can` stanno in `can.ts` (non `.tsx`) per la regola `react-refresh/only-export-components`.
- **DOMPurify** elimina `target` per default: `ADD_ATTR: ['target']` + hook `afterSanitizeAttributes` che forza `rel="noopener noreferrer"`.
- **arch_check `hardcoded-text`** segnala in `.tsx` i tipi come `=> Promise<PageModule>` (il pattern `>…<` vede testo): helper tipizzati di questo genere stanno in file `.ts` (es. `app/lazy-page.ts`).
- `import.meta.glob` di `shared/i18n` verso `features/*/locales` è un caricamento per convenzione (nessun import di codice): non viola la direzione dei livelli.
