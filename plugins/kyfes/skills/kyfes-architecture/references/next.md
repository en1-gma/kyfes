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
export const SUBJECTS = ['Order'] as const;              // registro dei soggetti delle feature
export type Subjects = SubjectName | ForcedSubject<SubjectName> | 'all';
export type AppAbility = MongoAbility<[Actions, Subjects]>;
export const buildAbility = (rules) => createMongoAbility<AppAbility>(rules);

// AbilityProvider: useMemo(() => buildAbility(session?.rules ?? []), [rules]) → <CaslAbilityProvider value={ability}>
export const Can = CaslCan as (props: CanProps<AppAbility>) => ReactNode; // Can di @casl/react 7 non è generico
export const useAbility = () => useCaslAbility<AppAbility>();
<RequirePermission action="read" subject="Order">…</RequirePermission> // altrimenti <ForbiddenPage/>
```

Nella feature: `orderSubject(order) = subject('Order', { ...order })`, `canEditOrder(ability, order)`, `canEditOrderStatus(ability, order)` (= `can('update', orderSubject(order), 'status')`), `writableOrderFields(ability, order?)` (`Set` dei campi di `ORDER_FIELDS` con `create` sul tipo o `update` sul record) e `pickWritable(values, writable)`. `<Can I="create" a={ORDER_SUBJECT}>` per il pulsante "Nuovo".

- `OrderForm` passa a `onSubmit` solo i campi scrivibili (`OrderWrite = Partial<OrderInput>`): create (POST) e update (PATCH); gli altri sono `readOnly` e mai inviati, il server applica i default (es. `status = draft`). I `fieldErrors` di un 422 finiscono sui campi; un messaggio che non è una chiave i18n diventa `validation.invalid`.
- `EditOrder` carica il record e verifica `canEditOrder`: se negato mostra `ForbiddenPage` (la guardia di rotta conosce solo il tipo).
- `ErrorState` su un 403 mostra "non autorizzato" (`errors.forbiddenTitle`/`errors.forbidden`) senza pulsante di retry.

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

`GET /orders/stats` restituisce `{ months: [{ month: 'YYYY-MM', total, count }] }` (`OrderStatsSchema`).

Mutation: create/update → `setQueryData(detail)` + `invalidateQueries(lists)` e `stats`. Delete ottimistico con `mutationKey: deleteOrderMutationKey` condivisa: `onMutate` (`cancelQueries`, snapshot con `getQueriesData`, `setQueriesData` che filtra la riga); `onError` ripristina lo snapshot solo se nessun'altra delete è in volo (`isMutating({ mutationKey }) > 1` → solo `invalidateQueries(lists, refetchType: 'none')`); `onSuccess` rimuove il dettaglio dalla cache; `onSettled` invalida liste e `stats` solo dall'ultima delete in volo. Il filtro di stato vive nello store Zustand `stores/orders-ui.store.ts` ed entra nella chiave.

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

- `src/proxy.ts` (Next 16: `export function proxy`, `config.matcher` `/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|mockServiceWorker.js).*)` più `missing` per i prefetch: esclude `/api` e `/api/*` ma non `/apidocs` o `/api-keys`): nonce `base64(randomUUID)`, header `x-nonce` e `Content-Security-Policy` sulla richiesta (Next applica il nonce ai suoi script) e sulla risposta.
- Produzione: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
- `next.config.ts`: HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, COOP; `poweredByHeader: false`; `productionBrowserSourceMaps: false`; `rewrites` `/api/:path*` → `API_ORIGIN` (server-only, https obbligatorio salvo localhost).
- Il nonce richiede rendering dinamico: il root layout legge cookie/header (tutte le rotte sono `ƒ`).

## Test

- `vitest.config.mts`: `@vitejs/plugin-react`, alias `@` → `src`, `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `fsModuleCache: false` (nessuna cache persistente dei moduli su disco), `server.deps.inline: ['next-intl']`.
- `src/test/setup.ts`: `server.listen({ onUnhandledFrame: 'error' })`, reset di handler, db mock e utente.
- `renderWithProviders(ui, { user: 'manager' | 'operator' | 'viewer', rules? })`: QueryClient senza retry, `NextIntlClientProvider` (it, common+orders), `StaticAbilityProvider`.
- Mock: `operator` crea/aggiorna solo `customerName` e `total`, aggiorna solo le bozze (`conditions: { status: 'draft' }`). Gli handler applicano le stesse regole CASL di `/auth/me` (tipo, record, ogni campo del body → 403) e rispondono 422 con `fieldErrors: Record<string, string[]>`.
- Copertura: `shared/lib` (anche `safeRedirect` su percorsi normalizzati), `env.test.ts` (`API_BASE_URL`), `http.test.ts` (config XSRF, ApiError, `fieldErrors` array, 401, refresh single-flight, richiesta lenta partita prima del refresh, `onUnauthorized` una volta, refresh di `/auth/me` senza loop, cancellazioni), `query-client.test.ts`, `session.test.tsx` (403 su `/auth/me` senza loop, schema tollerante), `ErrorState.test.tsx` (403), RBAC su `OrdersTable` e `OrdersPage` (manager/viewer/condizioni sul record), `OrderForm` (Zod, campo `status` in sola lettura), `OrderEditor.test.tsx` (operator: campi scrivibili in create/update, record non modificabile, `fieldErrors` sui campi), query/mutation con MSW (paginazione, create invalida, delete con rollback, delete concorrenti, dettaglio rimosso solo su successo), parità chiavi it/en (suffissi plurali ignorati), CSP e matcher del proxy.
- E2E: `npm run test:e2e` avvia `next dev` con `NEXT_PUBLIC_API_MOCKS=true`; `AxeBuilder({ page }).withTags([...]).analyze()` e verifica dell'header CSP.

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
