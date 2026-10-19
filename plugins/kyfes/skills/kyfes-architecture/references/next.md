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
src/app/AppShell.tsx      nav filtrata con can('read'), selettore lingua, logout, skip link
src/app/error.tsx, orders/error.tsx, RouteError.tsx    error boundary per rotta
src/app/not-found.tsx     NotFoundPage
src/app/orders/layout.tsx namespace `orders` lazy + OrdersGuard (RequireAuth + RequirePermission read Order)
src/app/orders/page.tsx   OrdersPage (Can create → "Nuovo", grafico, tabella)
src/app/orders/new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx (+ OrderEditGuard)
src/features/orders/      api/ (orders.api|queries|mutations.ts), components/, model/, locales/, stores/, permissions.ts, index.ts
src/shared/{api,auth,rbac,i18n,charts,ui,lib,config}
src/mocks/                handlers, data (utenti manager/viewer), browser.ts + MockGate.tsx, node.ts
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

Interceptor di risposta: 401 su chiamate non `/auth/*` → refresh single-flight `POST /auth/refresh` (promessa condivisa), ripetizione una sola volta (`_retried`), altrimenti `onUnauthorized()` registrato con `setOnUnauthorized(cb)`; ogni errore diventa `ApiError { status, code, message, correlationId, fieldErrors }` (correlationId dal body o dall'header `x-correlation-id`). `setRefreshPath(null)` disattiva il refresh.

`query-client.ts`: `createQueryClient({ onForbidden })` con `staleTime: 30_000`, `retry: shouldRetry` (niente retry su 4xx, max 2 su 5xx/rete), `QueryCache`/`MutationCache.onError` → `onForbidden` sui 403. `getQueryClient()` = nuovo client sul server, singleton nel browser. `pagination.ts`: `pageSchema(item)` e `PageParams { limit, cursor?, sort? }`.

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
});
login(returnTo)        // window.location.assign(new URL('/api/auth/login?returnTo=' + safeRedirect(...)))
logout(queryClient)    // POST /auth/logout → queryClient.clear() → navigazione completa
<RequireAuth>…</RequireAuth> // loading / errore / login automatico se session === null
```

`login`/`logout` usano URL assoluti (`new URL(path, location.origin)`): la regola `@next/next/no-location-assign-relative-destination` segnala i percorsi relativi, ma `/api/auth/login` non è una pagina Next e serve una navigazione completa.

## CASL (`shared/rbac`)

```ts
export const SUBJECTS = ['Order'] as const;              // registro dei soggetti delle feature
export type Subjects = SubjectName | ForcedSubject<SubjectName> | 'all';
export type AppAbility = MongoAbility<[Actions, Subjects]>;
export const buildAbility = (rules) => createMongoAbility<AppAbility>(rules);

// AbilityProvider: useMemo(() => buildAbility(session?.rules ?? []), [rules]) → <CaslAbilityProvider value={ability}>
export const Can = CaslCan as (props: CanProps<AppAbility>) => ReactNode; // Can di @casl/react 7 non è generico
export const useAbility = () => useCaslAbility<AppAbility>();
<RequirePermission action="read" subject="Order">…</RequirePermission> // altrimenti <ForbiddenPage/>
```

Nella feature: `orderSubject(order) = subject('Order', { ...order })`, `canEditOrder(ability, order)`, `canEditOrderStatus(ability, order)` (= `can('update', orderSubject(order), 'status')`). `<Can I="create" a={ORDER_SUBJECT}>` per il pulsante "Nuovo".

## TanStack Query (`features/orders/api`)

```ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (f: OrderListFilters & { limit: number }) => [...orderKeys.lists(), f] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
};
infiniteQueryOptions({
  queryKey: orderKeys.list({ ...filters, limit }),
  queryFn: ({ pageParam, signal }) => ordersApi.list({ limit, cursor: pageParam, ...filters }, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
```

Mutation: create/update → `setQueryData(detail)` + `invalidateQueries(lists)` e `stats`; delete → `onMutate` (`cancelQueries`, snapshot con `getQueriesData`, `setQueriesData` che filtra la riga), `onError` rollback, `onSettled` invalidazione. Il filtro di stato vive nello store Zustand `stores/orders-ui.store.ts` ed entra nella chiave.

## i18n (next-intl senza routing)

- `next.config.ts`: `createNextIntlPlugin('./src/shared/i18n/request.ts')`.
- `request.ts`: locale = cookie `NEXT_LOCALE` → `Accept-Language` → `NEXT_PUBLIC_DEFAULT_LOCALE`; `timeZone: 'Europe/Rome'`; messaggi globali = solo `{ common }`.
- Namespace lazy per rotta: la feature esporta `ordersMessages: NamespaceLoader` (`import('./locales/it.json')`); `src/app/orders/layout.tsx` usa `<I18nNamespaces loaders={[ordersMessages]}>` (da `@/shared/i18n/server`), che annida un `NextIntlClientProvider` con `common` + `orders`. Solo le rotte orders scaricano quelle stringhe.
- Cambio lingua: server action `setLocaleAction` (cookie HttpOnly, controllo Origin di Next) + `router.refresh()` in `useSwitchLocale()`; `useHtmlLang()` aggiorna `<html lang>`. Lingua della sessione applicata da `LocaleSync` in `providers.tsx` se l'utente non ha già un cookie.
- Componenti: `useTranslations('orders')`, `useFormatters()` → `formatDate/formatNumber/formatCurrency` legati al locale (funzioni pure in `format.ts`).
- Due entry: `@/shared/i18n` (client-safe) e `@/shared/i18n/server` (`import 'server-only'`, `getTranslations`, `I18nNamespaces`).

## Grafici (`shared/charts`)

`BarChart`/`LineChart` (`ChartProps { title, summary?, data, xKey, series, formatX?, formatValue?, height? }`): `ChartFrame` con `<figure>`, `div role="img" aria-label={title}`, riassunto e tabella in `<details>`; la parte Recharts (`ChartCanvas.tsx`, unico import di `recharts`) è caricata con `next/dynamic(..., { ssr: false })`, palette letta da `--chart-N` con `getComputedStyle`, tooltip/assi con i formatter Intl, `accessibilityLayer={false}` (il contenitore è già `role="img"`).

## Sicurezza del framework

- `src/proxy.ts` (Next 16: `export function proxy`, `config.matcher` che esclude `api`, `_next/static`, `_next/image`, `mockServiceWorker.js` e i prefetch): nonce `base64(randomUUID)`, header `x-nonce` e `Content-Security-Policy` sulla richiesta (Next applica il nonce ai suoi script) e sulla risposta.
- Produzione: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
- `next.config.ts`: HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, COOP; `poweredByHeader: false`; `productionBrowserSourceMaps: false`; `rewrites` `/api/:path*` → `API_ORIGIN` (server-only, https obbligatorio salvo localhost).
- Il nonce richiede rendering dinamico: il root layout legge cookie/header (tutte le rotte sono `ƒ`).

## Test

- `vitest.config.mts`: `@vitejs/plugin-react`, alias `@` → `src`, `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `server.deps.inline: ['next-intl']`.
- `src/test/setup.ts`: `server.listen({ onUnhandledFrame: 'error' })`, reset di handler, db mock e utente.
- `renderWithProviders(ui, { user: 'viewer' | 'manager', rules? })`: QueryClient senza retry, `NextIntlClientProvider` (it, common+orders), `StaticAbilityProvider`.
- Copertura: `shared/lib`, `http.test.ts` (config XSRF, ApiError, 401, refresh single-flight), RBAC su `OrdersTable` e `OrdersPage` (manager/viewer/condizioni sul record), `OrderForm` (Zod, campo `status` in sola lettura), query/mutation con MSW (paginazione, create invalida, delete con rollback), parità chiavi it/en, CSP.
- E2E: `npm run test:e2e` avvia `next dev` con `NEXT_PUBLIC_API_MOCKS=true`; `AxeBuilder({ page }).withTags([...]).analyze()` e verifica dell'header CSP.

## Trappole

- **`'use client'`**: ogni componente con hook (anche quelli di `shared/ui`, `shared/rbac`, `shared/auth`) va marcato; le pagine che usano `Can`/hook sono client component, quelle che leggono `params` (Promise in Next 16: `PageProps<'/orders/[id]'>` generato da `next typegen`) restano server e delegano a un componente client.
- **Import condizionali**: `msw/browser` ha la condizione `node: null`; un `import()` dinamico in un client component viene risolto anche per l'SSR e rompe `next dev`. Soluzione: `next/dynamic(() => import('@/mocks/MockGate'), { ssr: false })`. `worker.start()` va reso idempotente (StrictMode esegue gli effetti due volte).
- **CSP in sviluppo**: l'overlay di Next inietta stili inline; in dev `style-src 'self' 'unsafe-inline'` (con un nonce presente `'unsafe-inline'` verrebbe ignorato) e `'unsafe-eval'` per l'HMR. In produzione nessun `unsafe-*` (testato).
- **Recharts e CSP**: niente SSR dei grafici (`ssr: false`): l'HTML server con attributi `style` verrebbe bloccato da `style-src` con nonce; nel client React usa il CSSOM, consentito.
- **Variabili pubbliche**: Next sostituisce solo accessi letterali `process.env.NEXT_PUBLIC_X`; `env.ts` li elenca uno a uno. `API_ORIGIN` non ha prefisso ed è letta solo in `next.config.ts`.
- **next-intl**: i messaggi aggiunti da `I18nNamespaces` valgono per i client component; `getTranslations` lato server vede solo `common`. Impostare sempre `timeZone` (altrimenti warning `ENVIRONMENT_FALLBACK` e mismatch di idratazione).
- **TanStack Query nei test**: `renderHook` con proprietà tracciate non si ri-renderizza se il test legge solo `isSuccess`; per verificare i dati dopo un'invalidazione leggere `queryClient.getQueryData(key)`.
- **`next lint` non esiste più** in Next 16: lo script è `eslint .` con `eslint-config-next/core-web-vitals` + `/typescript` in flat config.
- **`next dev` crea `AGENTS.md`** nella root (regole per agenti di Next): non fa parte del template.
- **Script di installazione**: npm 11 non esegue i postinstall non approvati (`@swc/core`, `@parcel/watcher`, `unrs-resolver`); build, lint e test funzionano comunque.
