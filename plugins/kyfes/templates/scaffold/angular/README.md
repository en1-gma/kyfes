# kyfes scaffold — Angular

Reference scaffold for a back-office frontend that follows the **kyfes** rules
(`kyfes-architecture` skill: folder layout, security, HTTP client, TanStack Query, CASL RBAC, i18n, charts, tests).
Framework details and exact APIs: `skills/kyfes-architecture/references/angular.md` in the kyfes plugin.

Stack: Angular 22 (standalone, signals, zoneless) · HttpClient + functional interceptors · TanStack Angular Query ·
CASL + @casl/angular · Transloco · ECharts (ngx-echarts) · Zod + Reactive Forms · DOMPurify ·
Vitest (Angular `unit-test` builder) + Angular Testing Library + MSW · Playwright + axe.

## Getting started

```bash
npm install
npm run dev:mocks   # dev server with MSW (no backend needed); ?mockUser=viewer to try a read-only user
npm run dev         # dev server, /api proxied to http://localhost:8080 (proxy.conf.json)
```

Other scripts: `build`, `preview`, `lint`, `typecheck`, `test` (Vitest, single run), `test:e2e` (Playwright + axe, starts `dev:mocks`), `format`.

## Configuration

Public build-time variables (`NG_APP_*`, see `.env.example`) are defined in `angular.json` (`define`, per configuration)
and validated with Zod in `src/app/shared/config/env.ts`. Never put secrets there: they end up in the bundle.

Authentication is a BFF session cookie: the browser never sees tokens. Login is a full navigation to
`/api/auth/login?returnTo=…`; the session (`GET /api/auth/me`) carries the user, the CASL rules and the locale.

## Structure

```text
src/
├── main.ts                 bootstrap (+ MSW only with NG_APP_API_MOCKS='true' in dev)
├── mocks/                  MSW handlers (browser + node), test setup
├── testing/                test providers
└── app/
    ├── app.config.ts       providers: router, HttpClient, QueryClient, Transloco, auth, CASL
    ├── app.routes.ts       lazy pages, authGuard + permissionGuard
    ├── pages/              thin pages (layout, orders, 403, 404)
    ├── features/orders/    api/ (queries, mutations), components/, model/, locales/, permissions.ts, index.ts
    └── shared/             api, auth, rbac, i18n, charts, ui, lib, config
```

Security headers and CSP for production: `deploy/security-headers.conf` (nginx) together with
`security.autoCsp` in `angular.json`.
