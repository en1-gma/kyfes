# kyfes — Angular

Riferimento per i progetti Angular. Scaffold completo e verificato in `templates/scaffold/angular/` (lint, typecheck, test, build, arch_check, e2e verdi). Le regole restano quelle di `SKILL.md`; qui ci sono percorsi, versioni e API esatte.

## Versioni (scaffold, ottobre 2026)

| Pacchetto | Versione | Note |
|---|---|---|
| `@angular/*`, `@angular/build`, `@angular/cli` | ^22.2 | standalone, signals, **zoneless di default** (nessun `zone.js`, nessun `provideZonelessChangeDetection`) |
| `typescript` | ~6.0.3 | **non** TS 7: `@angular/compiler-cli` 22 richiede `>=6.0 <6.1` (per questo `~`, non `^`) |
| `@tanstack/angular-query-experimental` | ^5.104 | non esiste un pacchetto stabile `@tanstack/angular-query` (è a 0.0.0) |
| `@casl/ability` / `@casl/angular` | ^7.0 / ^10.0 | `AbilityServiceSignal` (signal), `AblePipe` deprecata |
| `@jsverse/transloco` | ^8.4 | |
| `echarts` / `ngx-echarts` | ^6.1 / ^22.0 | |
| `zod` | ^4.6 | |
| `dompurify` | ^3.4 | tipi inclusi |
| `vitest` / `jsdom` | ^5.0 / ^30 | runner del builder `@angular/build:unit-test` (default di Angular 22): niente `@analogjs/vitest-angular` |
| `@testing-library/angular` | ^19.6 | |
| `msw` | ^3.0 | opzione `onUnhandledFrame` (non più `onUnhandledRequest`) |
| `@playwright/test` / `@axe-core/playwright` | ^1.64 / ^4.14 | |
| `eslint` / `angular-eslint` / `typescript-eslint` | ^10 / ^22.6 / ^8.71 | flat config |

`npm install` senza `--legacy-peer-deps`. Progetto creato con `ng new --zoneless --test-runner=vitest --file-name-style-guide=2016` (nomi `*.component.ts`).

## Mappa dei file

```text
src/main.ts                          bootstrap; MSW solo se NG_APP_API_MOCKS==='true' && isDevMode()
src/mocks/{handlers,data,browser,node,test-setup}.ts   MSW (browser + node), utenti manager/viewer
src/testing/providers.ts             provideTestApp(): provider reali + Transloco di test
src/app/app.config.ts                provideRouter, provideApi, provideTanStackQuery, provideI18n, provideAuth, provideRbac
src/app/app.routes.ts                pagine lazy, authGuard + permissionGuard, scope i18n della feature
src/app/app-error-handler.ts         ErrorHandler globale + GlobalErrorState (error boundary)
src/app/pages/                       layout/, orders/ (lista, dettaglio, modifica, nuovo), forbidden/, not-found/
src/app/features/orders/             api/, components/<nome>/<nome>.component.{ts,html}, model/, locales/, permissions.ts, index.ts
src/app/shared/api/                  http.ts (provideApi, interceptor), api-client.ts (ApiClient), api-error.ts, api-events.ts, query-client.ts, pagination.ts
src/app/shared/auth/                 session.schema.ts, session.ts, auth.service.ts, auth.guard.ts, provide-auth.ts
src/app/shared/rbac/                 subjects.ts (Actions, SubjectName), ability.ts, can.directive.ts, permission.guard.ts
src/app/shared/i18n/                 i18n.ts, format.ts (formatter + pipe), title-strategy.ts, locales/{it,en}.json (namespace common)
src/app/shared/charts/               chart-frame.component.ts, bar-chart / line-chart, chart-options.ts, echarts-setup.ts
src/app/shared/{ui,lib,config}/      componenti senza logica; sanitize/safe-redirect/safe-url/zod-validator; env.ts
deploy/security-headers.conf         nginx: header, CSP, cache, nonce
proxy.conf.json                      /api → http://localhost:8080 in `ng serve`
```

Alias (tsconfig `paths`, uguali al preset di kyfes): `@app/*`, `@shared/*`, `@features/*`.

## Variabili pubbliche

Angular CLI non legge `.env`. I valori `NG_APP_*` sono costanti di build nell'opzione `define` di `angular.json` (per configurazione: `development`, `production`, `mocks`), scritte come letterali JS: `"NG_APP_API_BASE_URL": "'/api'"`. Si leggono solo in `shared/config/env.ts` (`declare const NG_APP_API_BASE_URL: string | undefined;` + parse Zod con default).

## Client HTTP e XSRF (`shared/api`)

```ts
provideHttpClient(                     // backend fetch di default in Angular 22 (withFetch è deprecato)
  withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
  withInterceptors([apiDefaultsInterceptor, authErrorInterceptor, apiErrorInterceptor]),
)
// apiDefaultsInterceptor: req.clone({ withCredentials: true, setHeaders: { Accept: 'application/json' }, timeout })
```

- L'interceptor XSRF di Angular aggiunge l'header solo per metodi non GET/HEAD e solo se l'URL ha la stessa origine di `location` (equivalente di `withXSRFToken` per same-origin).
- Ordine degli interceptor: l'ultimo è il più vicino al backend. `apiErrorInterceptor` (ultimo) trasforma `HttpErrorResponse` in `ApiError`; `authErrorInterceptor` vede già `ApiError`: 401 → refresh single-flight opzionale (`provideApi({ refreshSession: true })`, `POST /auth/refresh` con `HttpContextToken` per non ricorrere) e ripetizione una sola volta, poi `ApiEvents.emitUnauthorized()`; 403 → `emitForbidden()`.
- Callback registrabili: `inject(ApiEvents).onUnauthorized(fn)` / `onForbidden(fn)` (restituiscono la funzione di deregistrazione). `provideAuth()` li collega a sessione e login.
- Le feature usano solo `ApiClient`: `get(path, schema, params?)`, `post/put/patch(path, body, schema)`, `delete(path)`, `send(path)`. Ogni risposta passa da `schema.safeParse`; un payload non valido diventa `ApiError('INVALID_RESPONSE')`.
- `@angular/common/http` è ammesso solo in `shared/api` e `app` (nei test è libero).

## Sessione e guard (`shared/auth`)

```ts
export function sessionQueryOptions(api: ApiClient) {
  return queryOptions({ queryKey: ['session', 'me'], queryFn: () => api.get('/auth/me', SessionSchema), staleTime: 5 * 60_000 });
}
@Injectable({ providedIn: 'root' }) export class SessionStore {   // injectSession()
  readonly query = injectQuery(() => sessionQueryOptions(this.api));
  readonly user = computed(() => this.query.data()?.user ?? null);  // rules(), locale()
}
export const authGuard: CanActivateFn = async (_r, state) => { /* ensureQueryData; 401 → auth.login(state.url) */ };
```

`AuthService.login(returnTo)` → `BrowserLocation.assign('/api/auth/login?returnTo=' + encodeURIComponent(safeRedirect(returnTo)))`; `logout()` → `POST /auth/logout`, `queryClient.clear()`, `assign('/')`. `BrowserLocation` esiste per poterlo sostituire nei test.

## RBAC (`shared/rbac`)

```ts
export type SubjectName = 'Order';                              // registro dei soggetti (le feature fanno `satisfies SubjectName`)
export type AppSubject = SubjectName | ForcedSubject<SubjectName> | 'all';
export type AppAbility = MongoAbility<[Actions, AppSubject]>;
{ provide: Ability, useFactory: () => createMongoAbility<AppAbility>([]) }   // token richiesto da @casl/angular
effect(() => inject(AbilityServiceSignal).update(session.rules()));         // in provideRbac(): segue la sessione
```

- Nei componenti: `protected readonly can = injectCan();` e nel template `@if (can('update', orderSubject(order))) {…}`; per campo `can('update', orderSubject(order), 'status')`. `can` è reattivo (signal interno di `AbilityServiceSignal`).
- Direttiva strutturale: `<a *appCan="'create'; on: 'Order'" …>`.
- `subject` è ri-esportato da `@shared/rbac`; la feature espone `orderSubject(order) = subject('Order', { ...order })`.
- Guard: `canActivate: [permissionGuard('read', 'Order')]` restituisce `new RedirectCommand(router.parseUrl('/forbidden'), { skipLocationChange: true })`: si vede la pagina 403 e l'URL resta quello richiesto. Va dopo `authGuard` (stessa sessione in cache).

## TanStack Query (`features/orders/api`)

```ts
export const orderKeys = { all: ['orders'] as const, lists: () => [...orderKeys.all, 'list'] as const,
  list: (f: OrderListFilters) => [...orderKeys.lists(), f] as const, details: …, detail: (id) => …, stats: … };
export function ordersInfiniteQueryOptions(api: OrdersApi, filters) {
  return infiniteQueryOptions({ queryKey: orderKeys.list(filters),
    queryFn: ({ pageParam }) => api.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined, getNextPageParam: (last) => last.nextCursor ?? undefined });
}
export function injectOrdersList(filters = () => DEFAULT_ORDER_FILTERS) {
  const api = inject(OrdersApi);
  return injectInfiniteQuery(() => ordersInfiniteQueryOptions(api, filters()));
}
```

- I risultati sono signal: `orders.data()`, `isPending()`, `hasNextPage()`, `fetchNextPage()`.
- Mutation: `injectMutation(() => ({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.lists() }) }))`; il delete fa `cancelQueries` → `getQueriesData` → `setQueriesData` (rimozione ottimistica dalle pagine) → rollback in `onError` → invalidazione in `onSettled`.
- `QueryClient` si inietta con `inject(QueryClient)` (`injectQueryClient` è deprecato). Default in `createQueryClient()`: `staleTime: 30_000`, retry `false` su 4xx e `INVALID_RESPONSE`, massimo 2 su 5xx/rete.
- I componenti importano solo gli `inject*` della feature, mai `@tanstack/*` direttamente.

## i18n (Transloco, `shared/i18n`)

- `provideI18n()`: `provideTransloco({ config: { availableLangs: ['it','en'], defaultLang, fallbackLang, reRenderOnLangChange: true, scopes: { autoPrefixKeys: false } }, loader: CommonLoader })`. Il loader radice restituisce `{ common: <json> }`, quindi le chiavi sono `common.*`.
- **`autoPrefixKeys: false`** è voluto: con il default (`true`) dentro uno scope la chiave `common.x` diventerebbe `orders.common.x`. Usa sempre chiavi complete: `'orders.list.title' | transloco`.
- Namespace della feature in lazy: `providers: [provideOrdersI18n()]` sulla rotta `orders`. Dietro c'è `provideTranslocoScope({ scope: 'orders', loader: { it: () => import('./locales/it.json'), en: … } })` (un chunk per lingua).
- I componenti importano da `@shared/i18n`: `TranslocoPipe`, `I18nService` (`lang()`, `setLang()`), le pipe impure `localeDate`/`localeNumber`/`localeCurrency` e i formatter `formatDate/formatNumber/formatCurrency` (Intl).
- `<html lang>` si aggiorna in `provideI18n()` (`langChanges$`); la lingua della sessione prevale (effect in `app.config.ts`); i titoli di rotta sono chiavi (`I18nTitleStrategy`).
- Test di parità: `flattenKeys(en)` contro `flattenKeys(it)` per `common` e per ogni feature. Nei test `import itLocale from './it.json'`: un `import it` nasconde la `it()` di Vitest.

## Grafici (`shared/charts`)

- `ChartFrameComponent` con `providers: [provideEchartsCore({ echarts: () => import('./echarts-setup').then(m => m.echarts) })]`: ECharts core (solo bar/line/grid/tooltip/aria + SVGRenderer) in un chunk separato.
- Accessibilità: contenitore `role="img"` + `[attr.aria-label]="title()"`, tabella con gli stessi dati in un `figcaption` visivamente nascosto, `aria.decal` attivo (il colore non è l'unica informazione). Palette da `--chart-1…6` (styles.css); tooltip e asse con i formatter Intl.
- Nella feature il grafico sta in `@defer (on idle) { <app-bar-chart …/> } @placeholder { <app-spinner/> }`. I dati arrivano già trasformati dalla `select` di `orderStatsQueryOptions`.

## Sicurezza del framework

- `angular.json` → `"security": { "autoCsp": true }` in produzione: la build inserisce un `<meta http-equiv="Content-Security-Policy">` con `script-src 'strict-dynamic' 'sha256-…'` e trasforma gli script di `index.html` in un loader inline con hash. Lo disattiviamo in `development`/`mocks`.
- `index.html`: `<app-root ngCspNonce="__CSP_NONCE__">`. Con questo attributo la build aggiunge `nonce` a `<style>/<link>/<script>` generati, e Angular lo usa per gli stili dei componenti. nginx sostituisce il segnaposto con `$request_id` (`sub_filter`) e invia `style-src 'self' 'nonce-$request_id'`.
- L'header CSP (`deploy/security-headers.conf`) **non** contiene `default-src`/`script-src`: farebbe da fallback per gli script e bloccherebbe il loader di autoCsp, che non ha il nonce. Le direttive di fetch sono quindi elencate una per una. `base-uri 'self'`, non `'none'`, perché serve `<base href="/">`. Inoltre: HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'` + `X-Frame-Options: DENY`, `immutable` sugli asset con hash, `no-cache` su `index.html`, `*.map` → 404.
- Produzione: source map `hidden`, `public/mockServiceWorker.js` escluso dagli asset; il ramo MSW di `main.ts` viene eliminato perché `NG_APP_API_MOCKS` è una costante `define`.
- HTML dinamico: `[innerHTML]="sanitizeHtml(x)"` sulla stessa riga (DOMPurify + sanitizer di Angular). `bypassSecurityTrust*` è vietato anche dalla regola ESLint `no-restricted-syntax`.

## Test

- `ng test --watch=false` (builder `@angular/build:unit-test`, runner Vitest, jsdom). In `angular.json` → `test.options`: `setupFiles: ['src/mocks/test-setup.ts']`, `tsConfig: 'tsconfig.spec.json'`. Globali Vitest (`describe/it/vi`) con `types: ["vitest/globals"]`.
- MSW node: `server.listen({ onUnhandledFrame: 'error' })`, `resetHandlers()` e `resetMockDb()` dopo ogni test. Il backend fetch di HttpClient chiama `fetch('/api/…')` con URL relativo, che in Node fallisce: dopo `listen()` il setup avvolge `globalThis.fetch` e risolve gli URL relativi su `location.origin`.
- Client HTTP: `provideApi()` + `provideHttpClientTesting()` + `HttpTestingController` (withCredentials, XSRF same-origin/cross-origin, ApiError con correlationId, 401 → callback, refresh single-flight).
- RBAC: `render(OrdersPageComponent, { providers: provideTestApp(), deferBlockBehavior: DeferBlockBehavior.Manual })` con `useMockUser('manager' | 'viewer')`: con manager si vedono Nuovo/Modifica/Elimina (Elimina non sugli spediti, per la condizione CASL), con viewer nessuna azione né colonna Azioni.
- Query/mutation: `TestBed.runInInjectionContext(() => injectCreateOrder())` + `mutateAsync`, poi `getQueryState(orderKeys.list(f))?.isInvalidated`.
- E2E: `playwright.config.ts` avvia `npm run dev:mocks`; `e2e/orders.spec.ts` usa `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()`. È compilato da `npm run typecheck` (`e2e/tsconfig.json`).

## Trappole

1. **Zod e bundle**: `import { z } from 'zod'` porta nel chunk iniziale anche tutte le localizzazioni (circa 500 kB). Usa `import * as z from 'zod'` (o `import type * as z`): esbuild riesce a fare tree shaking.
2. `typecheck` con `ngc -p tsconfig.app.json --noEmit`: `tsc` da solo non controlla i template.
3. `define` vuole letterali JS: `"'/api'"`, non `"/api"` (altrimenti l'errore è "Invalid define value").
4. `inject()` dentro guard e `queryFn` asincroni: chiamalo prima del primo `await` (dopo si perde il contesto di iniezione).
5. `injectQuery`/`injectMutation` solo in un contesto di iniezione (campo di classe, costruttore, `runInInjectionContext`).
6. Gli scope di Transloco valgono per l'injector della rotta: un componente montato fuori da quella rotta (es. in un test) non carica il namespace. Nei test usa `TranslocoTestingModule` con `{ common, orders }` già caricati.
7. Un nonce letto da `ngCspNonce` va sostituito a ogni risposta. Se il server non usa `sub_filter`, gli stili vengono bloccati: in quel caso disattiva `ngCspNonce` e usa una CSP con hash anche per gli stili.
8. Il segnaposto `<title>` di `index.html` è testo statico (arch_check lo segnala come avviso): il titolo vero, tradotto, lo imposta `I18nTitleStrategy`.
9. ECharts nei test jsdom: tieni i grafici in `@defer` e usa `DeferBlockBehavior.Manual`; le opzioni si testano con `buildCartesianOptions` (funzione pura).
10. `@casl/angular` inietta il token `Ability` (classe di `@casl/ability`): va fornito anche se usi `createMongoAbility`.
