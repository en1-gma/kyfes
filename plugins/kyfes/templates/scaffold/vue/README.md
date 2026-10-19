# kyfes scaffold — Vue 3

Reference frontend for back-office apps, following the **kyfes** rules
(`kyfes-architecture` skill: layers `app → pages → features → shared`, BFF cookie session,
single axios client, TanStack Vue Query, CASL RBAC, vue-i18n, ECharts, Zod).

## Start

```bash
npm install
cp .env.example .env.local   # VITE_API_MOCKS=true → API mocked by MSW in dev
npm run dev                  # http://localhost:5173
```

Without mocks, `/api` is proxied by Vite to `API_ORIGIN` (the BFF). Mock user:
`VITE_MOCK_USER=manager` (manage Order), `operator` (customer and total only, drafts only) or `viewer` (read Order only).

## Scripts

| Script                      | What                                                    |
| --------------------------- | ------------------------------------------------------- |
| `dev` / `build` / `preview` | Vite                                                    |
| `typecheck`                 | `vue-tsc --build` (strict + `noUncheckedIndexedAccess`) |
| `lint` / `format`           | ESLint flat config / Prettier                           |
| `test`                      | Vitest + Vue Testing Library + MSW (`vitest run`)       |
| `test:e2e`                  | Playwright + axe (starts `vite` with mocks)             |

## Structure

```text
src/
├── app/        bootstrap: providers, router + guards, App.vue, global CSS tokens
├── pages/      one page per route (thin) + MainLayout + route names
├── features/
│   └── orders/ api/ (api, queries, mutations) · components/ · model/ · locales/ · stores/ · permissions.ts · index.ts
├── shared/     api · auth · rbac · i18n · charts · ui · lib · config
├── mocks/      MSW handlers (browser worker in dev, node server in tests)
└── test/       render helpers for tests
deploy/security-headers.conf   nginx: CSP, HSTS, caching
e2e/                           Playwright + axe
```

Rules, conventions and the exact APIs used are documented in kyfes
(`skills/kyfes-architecture/SKILL.md` and `references/vue.md`).
