# kyfes — Next.js (App Router)

Scaffold di riferimento: `templates/scaffold/next/`. In Next i livelli `app` e `pages` coincidono (`src/app`): le rotte `src/app/**/page.tsx` sono le pagine, i file non speciali in `src/app` (provider, guard, shell) sono il livello app.

## Versioni (npm `latest` a ottobre 2026, con `^`)

| Libreria | Versione | Note |
|---|---|---|
| next / react / react-dom | 16.4 / 19.3 | Turbopack di default, `proxy.ts` al posto di `middleware.ts` |
| @tanstack/react-query | 5.104 | |
| axios | 1.20 | solo in `shared/api` |
| @casl/ability / @casl/react | 7.0 / 7.0 | nuova API `AbilityProvider value` + `useAbility()` + `Can` |
| next-intl | 4.14 | senza routing per URL (locale da cookie) |
| recharts | 3.10 | richiede `react-is` come dipendenza |
| zod / react-hook-form / @hookform/resolvers | 4.6 / 7.90 / **5.9** | resolvers 6.0.0 dà ERESOLVE (peer opzionali interni in conflitto) |
| zustand | 5.0 | solo stato UI |
| dompurify | 3.4 | |
| typescript | **6.0** | TS 7 escluso: `typescript-eslint` (usato da `eslint-config-next`) richiede `<6.1` |
| eslint / eslint-config-next | **9.39** / 16.4 | ESLint 10 escluso: `eslint-plugin-react`, `-import`, `-jsx-a11y` accettano solo `^9` |
| vitest / vite / @vitejs/plugin-react / jsdom | 5.0 / 8.3 / 6.1 / 30 | |
| msw | 3.0 | opzione `onUnhandledFrame` (non più `onUnhandledRequest`) |
| @playwright/test / @axe-core/playwright | 1.64 / 4.14 | |

`npm audit` segnala 5 "high" su `braces` dentro `eslint-config-next` (solo devDependency, nessun fix non-breaking).

## Mappa dei file

```text
next.config.ts            header di sicurezza, rewrites /api → API_ORIGIN, poweredByHeader:false, plugin next-intl
src/proxy.ts              CSP con nonce per richiesta (buildCsp esportata e testata)
src/app/layout.tsx        root layout (server): <html lang>, NextIntlClientProvider (common), Providers, AppShell
src/app/providers.tsx     QueryClient, AbilityProvider, 401/403 → invalidazione sessione, sync locale, MSW gate
src/app/AppShell.tsx      nav filtrata con ability.can(ACTION.read, …), selettore lingua, logout, skip link
src/app/error.tsx, orders/error.tsx, RouteError.tsx    error boundary per rotta
src/app/global-error.tsx  boundary di ultima istanza (errori nel root layout): <html>/<body> propri, testo tradotto,
                          riferimento = correlationId o digest, pulsante retry (reset)
src/app/not-found.tsx     NotFoundPage
src/app/orders/layout.tsx namespace `orders` lazy + OrdersGuard (RequireAuth + RequirePermission read Order)
src/app/orders/page.tsx   OrdersPage (Can create → "Nuovo", grafico, tabella)
src/app/orders/new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx (+ OrderEditGuard: update Order sul tipo;
                          il controllo sul record è in EditOrder)
src/features/orders/      constants.ts (tutte le costanti della feature, foglia), api/ (orders.api|queries|mutations.ts),
                          components/, model/, locales/ (it|en.json, namespace.ts), stores/, permissions.ts, routes.ts, index.ts
src/shared/{api,auth,rbac,i18n,charts,ui,lib,config}
src/shared/config/        constants.ts (tutte le costanti trasversali, foglia, senza 'use client'), env.ts, runtime.ts (IS_DEV), csp.ts
src/shared/ui/            QueryState (loading → errore con retry → vuoto → contenuto), LoadMore (conteggio + "carica altri"),
                          ConfirmDeleteDialog (conferma distruttiva legata a un record); usati da OrdersTable, OrdersChart, OrderDetail, EditOrder
src/shared/i18n/standalone.tsx   StandaloneI18nProvider + useStandaloneLocale: messaggi `common` (it+en nel bundle) per global-error,
                          che sostituisce il root layout; locale da <html lang> o lingue del browser
src/mocks/                handlers, data (utenti manager/operator/viewer), browser.ts + MockGate.tsx, node.ts
src/test/                 setup.ts (MSW node), render.tsx (provider di test)
e2e/orders.spec.ts        Playwright + axe; playwright.config.ts avvia `npm run dev` con mock
```

## Client HTTP e XSRF (`shared/api/http.ts`)

```ts
export const http = axios.create({
  baseURL: env.API_BASE_URL,            // "/api", stessa origine (rewrite verso API_ORIGIN)
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: (config) => shouldSendXsrf(config), // true solo verso l'origine dell'API
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});
```

`shouldSendXsrf` è true solo se il target ha l'origine della pagina **e** quella dell'API (URL non parsabile → false).

Interceptor di risposta:
- Cancellazioni (`axios.isCancel`) rilanciate così come sono, non diventano errori di rete.
- 401 → refresh single-flight `POST /auth/refresh` (promessa condivisa) e ripetizione una sola volta (`_retried`). Esclusi `/auth/login|logout|refresh`; `/auth/me` viene rinfrescata ma il suo fallimento non chiama `onUnauthorized` (la sessione diventa `null`, ci pensa `RequireAuth`).
- Contatore `refreshGeneration` (salvato in `_refreshGeneration` da un interceptor di richiesta): una richiesta partita prima di un refresh già concluso riusa il suo esito, senza nuovo refresh.
- Refresh fallito → `onUnauthorized()` (registrato con `setOnUnauthorized(cb)`) **una volta** per tentativo, anche con più richieste in attesa. `setRefreshPath(null)` disattiva il refresh.
- Ogni errore diventa `ApiError { status, code, message, correlationId, fieldErrors }` (correlationId dal body o dall'header `x-correlation-id`; `fieldErrors: Record<string, string[]>`, tipo `FieldErrors`; getter `isForbidden`).

`query-client.ts`: `createQueryClient({ onForbidden })` con `staleTime: 30_000`, `retry: shouldRetry` (solo `ApiError` con `status` 0 o >= 500, max 2; mai su 4xx, `ZodError` o altri errori), `QueryCache`/`MutationCache.onError` → `onForbidden` sui 403, salvo query/mutation con `meta: { ignoreForbidden: true }`. `getQueryClient()` = nuovo client sul server, singleton nel browser. `pagination.ts`: `pageSchema(item)` e `PageParams { limit, cursor?, sort? }`.

`fetch` lato server è ammesso solo nei `server_globs` (`src/shared/api/server/**`, `*.server.ts`, `src/proxy.ts`, `src/app/api/**`); lo scaffold non ne ha bisogno: tutte le chiamate partono dal browser.

## Sessione (`shared/auth`)

```ts
export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: async ({ signal }) => {
    try { return SessionSchema.parse((await http.get('/auth/me', { signal })).data); }
    catch (e) { if (isApiError(e) && e.status === 401) return null; throw e; } // null = anonimo
  },
  staleTime: 5 * 60_000,
  meta: { ignoreForbidden: true },   // un 403 su /auth/me non invalida la sessione (altrimenti loop di refetch)
});
login(returnTo)        // window.location.assign(new URL('/api/auth/login?returnTo=' + safeRedirect(...)))
logout(queryClient)    // POST /auth/logout → queryClient.clear() → navigazione completa
<RequireAuth>…</RequireAuth> // loading / errore / login automatico se session === null
```

`SessionSchema` è tollerante: `locale: z.enum(LOCALES).optional().catch(undefined)` (locale sconosciuto o `null` → `undefined`); `action`/`subject` delle regole restano stringhe libere, quelle sconosciute semplicemente non fanno match.

`login`/`logout` usano URL assoluti (`new URL(path, location.origin)`): la regola `@next/next/no-location-assign-relative-destination` segnala i percorsi relativi, ma `/api/auth/login` non è una pagina Next e serve una navigazione completa.

## CASL (`shared/rbac`)

```ts
// shared/config/constants.ts (ri-esportate da shared/rbac/ability.ts e da @/shared/rbac)
export const ACTION = { create: 'create', read: 'read', update: 'update', delete: 'delete', manage: 'manage' } as const;
export const SUBJECT = { Order: 'Order' } as const;      // registro dei soggetti delle feature
// shared/rbac/ability.ts
export const SUBJECTS: readonly SubjectName[] = Object.values(SUBJECT);
export type Subjects = SubjectName | ForcedSubject<SubjectName> | 'all';
export type AppAbility = MongoAbility<[Actions, Subjects]>;
export const buildAbility = (rules) => createMongoAbility<AppAbility>(rules);

// AbilityProvider: useMemo(() => buildAbility(session?.rules ?? []), [rules]) → <CaslAbilityProvider value={ability}>
export const Can = CaslCan as (props: CanProps<AppAbility>) => ReactNode; // Can di @casl/react 7 non è generico
export const useAbility = () => useCaslAbility<AppAbility>();
<RequirePermission action={ACTION.update} subject={ORDER_SUBJECT}>…</RequirePermission> // altrimenti <ForbiddenPage/>
```

Nella feature: `ORDER_SUBJECT = SUBJECT.Order` in `constants.ts` (ri-esportato da `permissions.ts`); in `permissions.ts` `orderSubject(order) = subject(ORDER_SUBJECT, { ...order })`, `canEditOrder(ability, order)` (= `ability.can(ACTION.update, orderSubject(order))`), `canDeleteOrder(ability, order)`, `canEditOrderStatus(ability, order)` (= `ability.can(ACTION.update, orderSubject(order), ORDER_FIELD.status)`), `writableOrderFields(ability, order?)` (`Set` dei campi di `ORDER_FIELDS` con `create` sul tipo o `update` sul record) e `pickWritable(values, writable)`. `<Can I={ACTION.create} a={ORDER_SUBJECT}>` per il pulsante "Nuovo".

- `OrderForm` passa a `onSubmit` solo i campi scrivibili (`OrderWrite = Partial<OrderInput>`): create (POST) e update (PATCH); gli altri sono `readOnly` e mai inviati, il server applica i default (es. `status = DEFAULT_ORDER_STATUS`). I `fieldErrors` di un 422 finiscono sui campi; un messaggio che non è una chiave i18n diventa `validation.invalid`.
- `EditOrder` carica il record e verifica `canEditOrder`: se negato mostra `ForbiddenPage` (la guardia di rotta conosce solo il tipo).
- `ErrorState` su un 403 mostra "non autorizzato" (`errors.forbiddenTitle`/`errors.forbidden`) senza pulsante di retry.

## TanStack Query (`features/orders/api`)

```ts
export const orderKeys = {
  all: [ORDERS_ENDPOINT] as const,
  lists: () => [...orderKeys.all, ORDER_QUERY_SCOPE.list] as const,
  list: (f: OrderListFilters & { limit: number }) => [...orderKeys.lists(), f] as const,
  details: () => [...orderKeys.all, ORDER_QUERY_SCOPE.detail] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, ORDER_QUERY_SCOPE.stats] as const,
  remove: () => [...orderKeys.all, ORDER_QUERY_SCOPE.remove] as const,   // mutationKey condivisa dalle delete
};
infiniteQueryOptions({
  queryKey: orderKeys.list({ ...filters, limit }),
  queryFn: ({ pageParam, signal }) => ordersApi.list({ limit, cursor: pageParam, ...filters }, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
```

`GET /orders/stats` restituisce `{ months: [{ month: 'YYYY-MM', total, count }] }` (`OrderStatsSchema`).

Mutation: create/update → `setQueryData(detail)` + `invalidateQueries(lists)` e `stats`. Delete ottimistico con `mutationKey: orderKeys.remove()` condivisa: `onMutate` (`cancelQueries`, snapshot con `getQueriesData`, `setQueriesData` che filtra la riga); `onError` ripristina lo snapshot solo se nessun'altra delete è in volo (`isMutating({ mutationKey }) > 1` → solo `invalidateQueries(lists, refetchType: 'none')`); `onSuccess` rimuove il dettaglio dalla cache; `onSettled` invalida liste e `stats` solo dall'ultima delete in volo. Il filtro di stato vive nello store Zustand `stores/orders-ui.store.ts` ed entra nella chiave.

## i18n (next-intl senza routing)

- `next.config.ts`: `createNextIntlPlugin('./src/shared/i18n/request.ts')`.
- `request.ts`: locale = cookie `NEXT_LOCALE` → `Accept-Language` → `NEXT_PUBLIC_DEFAULT_LOCALE`; `timeZone: TIME_ZONE` (`shared/config/constants.ts`, ri-esportato da `shared/i18n/config.ts`); messaggi globali = solo `{ [COMMON_NS]: common }`.
- Namespace lazy per rotta: la feature esporta `ordersMessages: NamespaceLoader` (`import('./locales/it.json')`); `src/app/orders/layout.tsx` usa `<I18nNamespaces loaders={[ordersMessages]}>` (da `@/shared/i18n/server`), che annida un `NextIntlClientProvider` con `common` + `orders`. Solo le rotte orders scaricano quelle stringhe.
- Cambio lingua: server action `setLocaleAction` (cookie HttpOnly, controllo Origin di Next) + `router.refresh()` in `useSwitchLocale()`; `useHtmlLang()` aggiorna `<html lang>`. Lingua della sessione applicata da `LocaleSync` in `providers.tsx` se l'utente non ha già un cookie.
- Componenti: `useTranslations(ORDERS_NS)`, `useFormatters()` → `formatDate/formatNumber/formatCurrency` legati al locale (funzioni pure in `format.ts`).
- Due entry: `@/shared/i18n` (client-safe) e `@/shared/i18n/server` (`import 'server-only'`, `getTranslations`, `I18nNamespaces`).

## Grafici (`shared/charts`)

`BarChart`/`LineChart` (`ChartProps { title, summary?, data, xKey, series, formatX?, formatValue?, height? }`): `ChartFrame` con `<figure>`, `div role="img" aria-label={title}`, riassunto e tabella in `<details>`; la parte Recharts (`ChartCanvas.tsx`, unico import di `recharts`) è caricata con `next/dynamic(..., { ssr: false })`, palette letta da `--chart-N` con `getComputedStyle`, tooltip/assi con i formatter Intl, `accessibilityLayer={false}` (il contenitore è già `role="img"`).

## Sicurezza del framework

- `src/proxy.ts` (Next 16: `export function proxy`, `config.matcher` `/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|mockServiceWorker.js).*)` più `missing` per i prefetch: esclude `/api` e `/api/*` ma non `/apidocs` o `/api-keys`): nonce `base64(randomUUID)`, header `x-nonce` e `Content-Security-Policy` sulla richiesta (Next applica il nonce ai suoi script) e sulla risposta.
- Produzione: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
- `next.config.ts`: HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, COOP; `poweredByHeader: false`; `productionBrowserSourceMaps: false`; `rewrites` `/api/:path*` → `API_ORIGIN` (server-only, https obbligatorio salvo localhost).
- Il nonce richiede rendering dinamico: il root layout legge cookie/header (tutte le rotte sono `ƒ`).

## Test

- `vitest.config.mts`: `@vitejs/plugin-react`, alias `@` → `src`, `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `fsModuleCache: false` (nessuna cache persistente dei moduli su disco), `server.deps.inline: ['next-intl']`.
- `src/test/setup.ts`: `server.listen({ onUnhandledFrame: 'error' })`, reset di handler, db mock e utente.
- `renderWithProviders(ui, { user: 'manager' | 'operator' | 'viewer', rules? })`: QueryClient senza retry, `NextIntlClientProvider` (it, common+orders), `StaticAbilityProvider`.
- Mock: `operator` crea/aggiorna solo `customerName` e `total`, aggiorna solo le bozze (`conditions: { [ORDER_FIELD.status]: ORDER_STATUS.draft }`). Gli handler applicano le stesse regole CASL di `/auth/me` (tipo, record, ogni campo del body → 403) e rispondono 422 con `fieldErrors: Record<string, string[]>`.
- Copertura: `shared/lib` (anche `safeRedirect` su percorsi normalizzati), `env.test.ts` (`API_BASE_URL`), `http.test.ts` (config XSRF, ApiError, `fieldErrors` array, 401, refresh single-flight, richiesta lenta partita prima del refresh, `onUnauthorized` una volta, refresh di `/auth/me` senza loop, cancellazioni), `query-client.test.ts`, `session.test.tsx` (403 su `/auth/me` senza loop, schema tollerante), `ErrorState.test.tsx` (403), RBAC su `OrdersTable` e `OrdersPage` (manager/viewer/condizioni sul record), `OrderForm` (Zod, campo `status` in sola lettura), `OrderEditor.test.tsx` (operator: campi scrivibili in create/update, record non modificabile, `fieldErrors` sui campi), query/mutation con MSW (paginazione, create invalida, delete con rollback, delete concorrenti, dettaglio rimosso solo su successo), parità chiavi it/en (suffissi plurali ignorati), CSP e matcher del proxy.
- E2E: `npm run test:e2e` avvia `next dev` con `NEXT_PUBLIC_API_MOCKS=true`; `AxeBuilder({ page }).withTags([...]).analyze()` e verifica dell'header CSP.

## Costanti (`constants.ts`) e riuso

Ogni costante di dominio è scritta una volta, solo in uno dei due `constants.ts` (regola `constants-location`, schema generale in `SKILL.md` sez. 9.1); gli altri moduli importano e compongono. Entrambi i file sono foglie senza `'use client'`: `shared/config/constants.ts` non importa nulla, `features/orders/constants.ts` importa solo `SUBJECT` da `@/shared/config/constants`.

| Costante | File | Ri-esportata da (compatibilità) |
|---|---|---|
| `ORDER_SUBJECT` (= `SUBJECT.Order`) | `features/orders/constants.ts` | `permissions.ts`, `index.ts` |
| `ORDERS_NS` | `features/orders/constants.ts` | `locales/namespace.ts`, `index.ts` |
| `ORDERS_ENDPOINT`, `ORDERS_ENDPOINT_SEGMENT` | `features/orders/constants.ts` | `api/orders.api.ts`, `index.ts` (solo `ORDERS_ENDPOINT`) |
| `ORDER_QUERY_SCOPE` | `features/orders/constants.ts` | (interno: lo usa `orderKeys`) |
| `ORDERS_ROOT`, `ORDER_ROUTE_SEGMENT` | `features/orders/constants.ts` | (interni: li compone `routes.ts`) |
| `ORDER_STATUS`, `ORDER_STATUSES`, `DEFAULT_ORDER_STATUS` | `features/orders/constants.ts` | `model/orders.schema.ts`, `index.ts` |
| `ORDER_FIELD`, `ORDER_FIELDS` | `features/orders/constants.ts` | `model/orders.schema.ts`, `index.ts` |
| `ORDER_VALIDATION` (chiavi i18n dei messaggi Zod) | `features/orders/constants.ts` | (interno: `model/orders.schema.ts`) |
| `ACTION`, `SUBJECT` | `shared/config/constants.ts` | `shared/rbac/ability.ts`, `@/shared/rbac` |
| `AUTH_ENDPOINTS`, `DEFAULT_API_BASE_URL` | `shared/config/constants.ts` | `shared/api/http.ts`, `@/shared/api` (`AUTH_ENDPOINTS`) |
| `XSRF_COOKIE`, `XSRF_HEADER`, `CORRELATION_ID_HEADER` | `shared/config/constants.ts` | (usati da `shared/api/http.ts`) |
| `CSP_HEADER`, `NONCE_HEADER`, `CSP_SRC` | `shared/config/constants.ts` | `shared/config/csp.ts` (`CSP_HEADER`, `NONCE_HEADER`; `CSP_SRC` importato come `SRC`) |
| `ENV_FLAG` | `shared/config/constants.ts` | (importato come `FLAG` da `shared/config/env.ts`) |
| `LOCALES`, `LOCALE_COOKIE`, `TIME_ZONE`, `COMMON_NS` | `shared/config/constants.ts` | `shared/config/env.ts` (`LOCALES`), `shared/i18n/config.ts`, `@/shared/i18n` (tranne `LOCALE_COOKIE`), `@/shared/i18n/server` (`COMMON_NS`) |
| `DEFAULT_CURRENCY`, `DATE_FORMAT` | `shared/config/constants.ts` | `shared/i18n/format.ts` e `@/shared/i18n` (`DATE_FORMAT`) |
| `BUTTON_VARIANT` | `shared/config/constants.ts` | `shared/ui/Button.tsx`, `@/shared/ui` |
| `CHART_KIND`, `CHART_PALETTE_TOKENS` | `shared/config/constants.ts` | `shared/charts/types.ts` (`CHART_KIND`); `CHART_PALETTE_TOKENS` importato come `TOKENS` da `palette.ts` |
| `STYLE` (DOMPurify) | `shared/config/constants.ts` | (usato da `shared/lib/sanitize.ts`) |

Restano fuori da `constants.ts` i valori composti o derivati e i numeri (la regola guarda le stringhe letterali): `orderPaths` (`routes.ts`, da `ORDERS_ROOT` e `ORDER_ROUTE_SEGMENT`), `orderKeys` (`api/orders.queries.ts`, radice `[ORDERS_ENDPOINT]` + `ORDER_QUERY_SCOPE`), `orderSubject()`/`writableOrderFields()` (`permissions.ts`), `ordersMessages` (`locales/namespace.ts`), `SUBJECTS = Object.values(SUBJECT)` (`shared/rbac/ability.ts`), `DEFAULT_LOCALE = env.DEFAULT_LOCALE` (`shared/i18n/config.ts`), `IS_DEV` (`shared/config/runtime.ts`, confronto su `process.env.NODE_ENV`), `DEFAULT_PAGE_SIZE` (`shared/api/pagination.ts`).

Uso tipico: `<Can I={ACTION.create} a={ORDER_SUBJECT}>` + `<Link href={orderPaths.new} className={buttonClassName(BUTTON_VARIANT.primary)}>` in `app/orders/page.tsx`, `useTranslations(ORDERS_NS)`, `formatDate(value, DATE_FORMAT.dateTime)`, `ability.can(ACTION.update, orderSubject(order), ORDER_FIELD.status)`. Pagine e app importano dal barrel `@/features/orders`; dentro la feature i moduli importano da `./constants`/`../constants`; i mock (`mocks/handlers.ts`) importano direttamente `@/features/orders/constants` e `@/shared/config/constants`.

**Server Component**: le costanti che un Server Component o `proxy.ts` deve leggere come valore stanno in moduli **senza** `'use client'`: i due `constants.ts` e chi le ri-esporta (`routes.ts`, `model/`, `locales/namespace.ts`, `shared/rbac/ability.ts`, `shared/i18n/config.ts`, `shared/config/*`, `shared/ui/Button.tsx`); da un modulo client arriverebbe un riferimento client, non il valore. Esempi: `redirect(orderPaths.list)` in `app/page.tsx`, `getTranslations(COMMON_NS)` da `@/shared/i18n/server` in `app/layout.tsx` e `app/orders/layout.tsx`, `IS_DEV`/`CSP_HEADER` in `proxy.ts`.

Nuova feature (`customers`):
1. `shared/config/constants.ts`: aggiungi `Customer: 'Customer'` a `SUBJECT` (unica modifica a shared).
2. `features/customers/constants.ts`, foglia senza `'use client'` (importa al più `@/shared/config/constants`): `CUSTOMER_SUBJECT = SUBJECT.Customer`, `CUSTOMERS_NS`, `CUSTOMERS_ENDPOINT`, `CUSTOMER_QUERY_SCOPE`, `CUSTOMERS_ROOT`/`CUSTOMER_ROUTE_SEGMENT` (devono seguire le cartelle `src/app/customers/…`), `CUSTOMER_STATUS`/`CUSTOMER_STATUSES`/`DEFAULT_CUSTOMER_STATUS`, `CUSTOMER_FIELD`/`CUSTOMER_FIELDS`, `CUSTOMER_VALIDATION`. Meglio di Orders: una `CUSTOMERS_FEATURE = 'customers'` da cui derivare namespace, endpoint (`` `/${CUSTOMERS_FEATURE}` ``) e radice delle rotte, così `'/customers'` non è scritto due volte.
3. Gli altri file importano da `../constants`: `permissions.ts`, `model/customers.schema.ts`, `locales/namespace.ts` (`customersMessages`), `api/customers.api.ts`, `customerKeys`, `routes.ts` (`customerPaths`); `index.ts` ri-esporta quello che usano app e pagine.

Eccezioni note: `'/orders'` compare due volte in `features/orders/constants.ts`, come `ORDERS_ENDPOINT` (risorsa REST) e come `ORDERS_ROOT` (percorso dell'App Router), omonimi di concetti diversi; in una nuova feature si derivano entrambi da un `<F>_FEATURE` (sez. 9.1). `'short'` compare due volte in `DATE_FORMAT` (`timeStyle` e `month`, opzioni `Intl`). Metrica attuale dello scaffold (`python3 -B scripts/arch_check.py`): **nessuna violazione, 2 valori duplicati su 112 (1,8%)**, soglia 10%.

## Trappole

- **`'use client'`**: ogni componente con hook (anche quelli di `shared/ui`, `shared/rbac`, `shared/auth`) va marcato; le pagine che usano `Can`/hook sono client component, quelle che leggono `params` (Promise in Next 16: `PageProps<'/orders/[id]'>` generato da `next typegen`) restano server e delegano a un componente client.
- **Import condizionali**: `msw/browser` ha la condizione `node: null`; un `import()` dinamico in un client component viene risolto anche per l'SSR e rompe `next dev`. Soluzione: `next/dynamic(() => import('@/mocks/MockGate'), { ssr: false })`. `worker.start()` va reso idempotente (StrictMode esegue gli effetti due volte).
- **CSP in sviluppo**: l'overlay di Next inietta stili inline; in dev `style-src 'self' 'unsafe-inline'` (con un nonce presente `'unsafe-inline'` verrebbe ignorato) e `'unsafe-eval'` per l'HMR. In produzione nessun `unsafe-*` (testato).
- **Recharts e CSP**: niente SSR dei grafici (`ssr: false`): l'HTML server con attributi `style` verrebbe bloccato da `style-src` con nonce; nel client React usa il CSSOM, consentito.
- **Variabili pubbliche**: Next sostituisce solo accessi letterali `process.env.NEXT_PUBLIC_X`; `env.ts` li elenca uno a uno e valida `API_BASE_URL` con `isValidApiBaseUrl` (path same-origin non `//…` e senza `\`, oppure `https://`). `API_ORIGIN` non ha prefisso ed è letta solo in `next.config.ts`.
- **next-intl**: i messaggi aggiunti da `I18nNamespaces` valgono per i client component; `getTranslations` lato server vede solo `common`. Impostare sempre `timeZone` (altrimenti warning `ENVIRONMENT_FALLBACK` e mismatch di idratazione).
- **`safeRedirect`**: `new URL` risolve i dot segment (`/.//evil.example` → `//evil.example`); il risultato normalizzato e il pathname con `%2F`/`%5C` decodificati sono ricontrollati: `//…` o `\` → fallback.
- **403 su `/auth/me`**: `onForbidden` invalida la sessione; senza `meta: { ignoreForbidden: true }` sulla query di sessione il suo stesso 403 la rifarebbe all'infinito.
- **`global-error.tsx`** sostituisce il root layout: niente `NextIntlClientProvider` né request config, serve `StandaloneI18nProvider`.
- **TanStack Query nei test**: `renderHook` con proprietà tracciate non si ri-renderizza se il test legge solo `isSuccess`; per verificare i dati dopo un'invalidazione leggere `queryClient.getQueryData(key)`.
- **`next lint` non esiste più** in Next 16: lo script è `eslint .` con `eslint-config-next/core-web-vitals` + `/typescript` in flat config.
- **`next dev` crea `AGENTS.md`** nella root (regole per agenti di Next): non fa parte del template.
- **Script di installazione**: npm 11 non esegue i postinstall non approvati (`@swc/core`, `@parcel/watcher`, `unrs-resolver`); build, lint e test funzionano comunque.
