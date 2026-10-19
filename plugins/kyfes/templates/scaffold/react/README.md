# kyfes React scaffold

Reference React + Vite application that follows the **kyfes** frontend rules
(`plugins/kyfes/skills/kyfes-architecture/SKILL.md`, details in `references/react.md`).

Stack: React 19, Vite 8, React Router 8 (data mode), TanStack Query 5, axios, CASL 7 (`@casl/react`),
i18next + react-i18next, Recharts 3, Zustand (UI state only), Zod 4 + React Hook Form, DOMPurify,
Vitest + Testing Library + MSW 3, Playwright + axe.

## Getting started

```bash
cp .env.example .env.local     # adjust VITE_* (public) and API_PROXY_TARGET (dev proxy only)
npm install
npm run dev                    # http://localhost:5173, /api proxied to API_PROXY_TARGET
```

Without a backend, enable the mocks: `VITE_API_MOCKS=true npm run dev`. MSW answers `/api/*`
(session, orders CRUD with cursor pagination, stats, 403/500 errors). Choose the mock user with
`VITE_MOCK_USER=manager|viewer|operator` (manager: `manage Order`; viewer: `read Order`;
operator: field/condition-level rules).

| Script                                  | What it does                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `preview`     | Vite dev server, type-check + production build, serve the build                     |
| `npm run lint` / `typecheck` / `format` | ESLint (flat config), `tsc -b`, Prettier                                            |
| `npm test`                              | Vitest (jsdom + MSW), single run                                                    |
| `npm run test:e2e`                      | Playwright + axe against the dev server with mocks (`npx playwright install` first) |

## Structure

```text
src/
├── app/        bootstrap: providers, router (guards + lazy pages), layout, error boundary, styles
├── pages/      one thin page per route
├── features/   orders/ (api, components, model, locales, stores, permissions.ts, routes.ts, index.ts)
├── shared/     api · auth · rbac · i18n · charts · ui · lib · config
├── mocks/      MSW handlers (browser in dev, node in tests)
└── test/       Vitest setup and render helpers
deploy/security-headers.conf   nginx snippet: CSP, HSTS, caching
```

Security model: the browser never sees tokens. Login/logout go through the BFF (`/api/auth/*`),
the session is an `HttpOnly` cookie, unsafe requests carry `X-XSRF-TOKEN` (double submit), and
permissions come from `GET /api/auth/me` as CASL rules. See kyfes for the full rules.
