# kyfes reference scaffold — Next.js (App Router)

Reference implementation of the **kyfes** frontend rules (see the `kyfes-architecture` skill and
`references/next.md`): BFF session in an HttpOnly cookie, single axios client with XSRF,
TanStack Query, CASL RBAC on CRUD, next-intl, Recharts wrappers, nonce-based CSP.

## Getting started

```bash
npm install
cp .env.example .env.local      # set API_ORIGIN (server-only) to your BFF/backend
npm run dev                     # http://localhost:3000
```

### Mocked API (no backend)

```bash
npm run dev:mocks               # NEXT_PUBLIC_API_MOCKS=true: MSW intercepts /api in the browser
```

Mock users live in `src/mocks/data.ts`: `manager` (manage Order), `operator` (create/update only
`customerName` and `total`, update only drafts) and `viewer` (read Order). The handlers enforce the
same CASL rules (conditions and fields) and answer 422 with `fieldErrors: Record<string, string[]>`.
Switch with `setMockUser()` or override the `/api/auth/me` handler (`sessionHandler('viewer')`).

## Scripts

| Script                          | What it does                                          |
| ------------------------------- | ----------------------------------------------------- |
| `dev` / `dev:mocks`             | Next dev server (Turbopack), optionally with MSW      |
| `build` / `preview`             | Production build / `next start`                       |
| `lint` / `typecheck` / `format` | ESLint (flat config), `next typegen && tsc`, Prettier |
| `test`                          | Vitest + Testing Library + MSW (node)                 |
| `test:e2e`                      | Playwright + axe (starts `npm run dev` with mocks)    |

## Structure

```text
src/
├── app/            # layout, providers, error boundaries and routes (page.tsx = pages layer)
├── features/orders # api/ (endpoints, queries, mutations), components/, model/, locales/, permissions.ts
├── shared/         # api, auth, rbac, i18n, charts, ui, lib, config
├── mocks/          # MSW handlers (browser + node)
└── proxy.ts        # per-request CSP nonce (Next 16 "proxy", formerly middleware)
```

Dependencies only go downwards: `app → features → shared`. Libraries are confined to their
`shared/*` folder (axios → `shared/api`, recharts → `shared/charts`, next-intl → `shared/i18n`,
CASL → `shared/rbac`, DOMPurify → `shared/lib`). Security headers are in `next.config.ts`,
`/api/*` is rewritten to `API_ORIGIN`.
