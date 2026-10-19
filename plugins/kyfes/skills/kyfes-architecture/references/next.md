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
src/features/orders/      api/ (orders.api|queries|mutations.ts), components/, model/, locales/, stores/, permissions.ts, index.ts
src/shared/{api,auth,rbac,i18n,charts,ui,lib,config}
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
export const ACTION = { create: 'create', read: 'read', update: 'update', delete: 'delete', manage: 'manage' } as const;
export const SUBJECT = { Order: 'Order' } as const;      // registro dei soggetti delle feature
export const SUBJECTS: readonly SubjectName[] = Object.values(SUBJECT);
export type Subjects = SubjectName | ForcedSubject<SubjectName> | 'all';
export type AppAbility = MongoAbility<[Actions, Subjects]>;
export const buildAbility = (rules) => createMongoAbility<AppAbility>(rules);

// AbilityProvider: useMemo(() => buildAbility(session?.rules ?? []), [rules]) → <CaslAbilityProvider value={ability}>
export const Can = CaslCan as (props: CanProps<AppAbility>) => ReactNode; // Can di @casl/react 7 non è generico
export const useAbility = () => useCaslAbility<AppAbility>();
<RequirePermission action={ACTION.update} subject={ORDER_SUBJECT}>…</RequirePermission> // altrimenti <ForbiddenPage/>
```

Nella feature (`permissions.ts`): `ORDER_SUBJECT = SUBJECT.Order`, `orderSubject(order) = subject(ORDER_SUBJECT, { ...order })`, `canEditOrder(ability, order)` (= `ability.can(ACTION.update, orderSubject(order))`), `canDeleteOrder(ability, order)`, `canEditOrderStatus(ability, order)` (= `ability.can(ACTION.update, orderSubject(order), ORDER_FIELD.status)`), `writableOrderFields(ability, order?)` (`Set` dei campi di `ORDER_FIELDS` con `create` sul tipo o `update` sul record) e `pickWritable(values, writable)`. `<Can I={ACTION.create} a={ORDER_SUBJECT}>` per il pulsante "Nuovo".

- `OrderForm` passa a `onSubmit` solo i campi scrivibili (`OrderWrite = Partial<OrderInput>`): create (POST) e update (PATCH); gli altri sono `readOnly` e mai inviati, il server applica i default (es. `status = DEFAULT_ORDER_STATUS`). I `fieldErrors` di un 422 finiscono sui campi; un messaggio che non è una chiave i18n diventa `validation.invalid`.
- `EditOrder` carica il record e verifica `canEditOrder`: se negato mostra `ForbiddenPage` (la guardia di rotta conosce solo il tipo).
- `ErrorState` su un 403 mostra "non autorizzato" (`errors.forbiddenTitle`/`errors.forbidden`) senza pulsante di retry.

## TanStack Query (`features/orders/api`)

```ts
export const orderKeys = {
  all: [ORDERS_ENDPOINT] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (f: OrderListFilters & { limit: number }) => [...orderKeys.lists(), f] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  remove: () => [...orderKeys.all, 'remove'] as const,   // mutationKey condivisa dalle delete
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
- `request.ts`: locale = cookie `NEXT_LOCALE` → `Accept-Language` → `NEXT_PUBLIC_DEFAULT_LOCALE`; `timeZone: TIME_ZONE` (`shared/i18n/config.ts`); messaggi globali = solo `{ [COMMON_NS]: common }`.
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

## Costanti e riuso (`constant-reuse`)

Ogni valore di dominio è scritto una volta e importato (schema generale in `SKILL.md` sez. 9.1). Dove vive nello scaffold:

| Valore | Costante | File |
|---|---|---|
| azioni CASL | `ACTION` (`ACTION.update`, mai `'update'`) | `shared/rbac/ability.ts` |
| registro soggetti | `SUBJECT = { Order: 'Order' }`, `SUBJECTS` | `shared/rbac/ability.ts` |
| soggetto e campi | `ORDER_SUBJECT = SUBJECT.Order`, `orderSubject()`; campi `ORDER_FIELD`/`ORDER_FIELDS` | `features/orders/permissions.ts`; `model/orders.schema.ts` |
| namespace i18n | `ORDERS_NS` + loader `ordersMessages`; comune `COMMON_NS` | `features/orders/locales/namespace.ts`; `shared/i18n/config.ts` |
| stati e default | `ORDER_STATUS`, `ORDER_STATUSES`, `DEFAULT_ORDER_STATUS` (nessun ordinamento predefinito nello scaffold: se serve, `ORDER_SORT` qui) | `model/orders.schema.ts` |
| percorsi UI | `orderPaths` (radice privata `ORDERS_ROOT`) | `features/orders/routes.ts` |
| endpoint | `ORDERS_ENDPOINT = '/orders'`; `AUTH_ENDPOINTS` | `api/orders.api.ts`; `shared/api/http.ts` |
| query/mutation key | `orderKeys` (radice `[ORDERS_ENDPOINT]`, `remove()` per le delete) | `api/orders.queries.ts` |
| trasversali | `BUTTON_VARIANT` (`shared/ui/Button.tsx`), `CHART_KIND` (`shared/charts/types.ts`), `DATE_FORMAT` (`shared/i18n/format.ts`), `LOCALE_COOKIE`/`TIME_ZONE`/`DEFAULT_LOCALE` (`shared/i18n/config.ts`), `LOCALES` (`shared/config/env.ts`), `IS_DEV` (`shared/config/runtime.ts`), `CSP_HEADER`/`NONCE_HEADER` (`shared/config/csp.ts`), `DEFAULT_PAGE_SIZE` | `shared/*` |

Uso tipico: `<Can I={ACTION.create} a={ORDER_SUBJECT}>` + `<Link href={orderPaths.new} className={buttonClassName(BUTTON_VARIANT.primary)}>` in `app/orders/page.tsx`, `useTranslations(ORDERS_NS)`, `formatDate(value, DATE_FORMAT.dateTime)`, `ability.can(ACTION.update, orderSubject(order), ORDER_FIELD.status)`.

**Server Component**: le costanti che un Server Component o `proxy.ts` deve leggere come valore stanno in moduli **senza** `'use client'` (`routes.ts`, `model/`, `locales/namespace.ts`, `shared/rbac/ability.ts`, `shared/i18n/config.ts`, `shared/config/*`, `shared/ui/Button.tsx`): da un modulo client arriverebbe un riferimento client, non il valore. Esempi: `redirect(orderPaths.list)` in `app/page.tsx`, `getTranslations(COMMON_NS)` da `@/shared/i18n/server` in `app/layout.tsx` e `app/orders/layout.tsx`, `IS_DEV`/`CSP_HEADER` in `proxy.ts`.

Nuova feature (`customers`): `Customer: 'Customer'` in `SUBJECT` di `shared/rbac/ability.ts` e `CUSTOMER_SUBJECT = SUBJECT.Customer` in `permissions.ts`; `CUSTOMER_FIELD`/`CUSTOMER_FIELDS`, stati e ordinamenti in `model/customers.schema.ts`; `CUSTOMERS_NS` e `customersMessages` in `locales/namespace.ts`; `CUSTOMERS_ENDPOINT` in `api/customers.api.ts` e `customerKeys` con radice `[CUSTOMERS_ENDPOINT]`; `customerPaths` in `routes.ts`, che deve seguire le cartelle `src/app/customers/…`; tutto riesportato da `index.ts`, nessun `'use client'` in questi moduli.

Eccezioni note: `'/orders'` compare come radice di `orderPaths` (`routes.ts`) e come `ORDERS_ENDPOINT` (`api/orders.api.ts`), omonimi di concetti diversi (percorso dell'App Router e risorsa REST); in una nuova feature si derivano entrambi da un `<F>_FEATURE` (sez. 9.1). `'short'` compare due volte in `DATE_FORMAT` (`timeStyle` e `month`, opzioni `Intl`). Metrica attuale dello scaffold (`arch_check.py`): **2 valori duplicati su 110 (1,8%)**, soglia 10%.

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
