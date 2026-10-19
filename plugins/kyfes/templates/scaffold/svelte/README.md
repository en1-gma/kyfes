# kyfes scaffold — SvelteKit

Reference scaffold for kyfes (Know Your Frontend): SvelteKit 3 + Svelte 5 runes,
TanStack Svelte Query, axios, CASL, Paraglide JS, ECharts, Zod, DOMPurify, Vitest + MSW, Playwright + axe.
The architecture rules live in the kyfes plugin (`skills/kyfes-architecture/SKILL.md` and
`references/svelte.md`): read them before changing the structure.

## Getting started

```sh
cp .env.example .env      # PUBLIC_API_MOCKS=true → no backend needed
npm install
npm run dev               # http://localhost:5173
```

| Script              | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Vite dev server (`/api` proxied to `API_ORIGIN`, or MSW mocks) |
| `npm run build`     | Production build (adapter-node → `build/`, run `node build`)   |
| `npm run preview`   | Preview the production build                                   |
| `npm run lint`      | ESLint + Prettier check                                        |
| `npm run typecheck` | `svelte-kit sync` + Paraglide compile + `svelte-check`         |
| `npm run test`      | Vitest (jsdom + MSW), single run                               |
| `npm run test:e2e`  | Playwright + axe against the dev server with mocks             |
| `npm run format`    | Prettier write                                                 |

## Mocks

With `PUBLIC_API_MOCKS=true` (dev only) the browser uses MSW (`src/mocks`). Choose the user with a
query string on the first page load: `?mockUser=manager` (manage Order, default),
`?mockUser=viewer` (read Order only) or `?mockUser=anonymous` (401 → login).

## Structure

```text
src/
├── hooks.server.ts / hooks.client.ts / env.ts / app.html   ← app: headers, CSP, env, mocks
├── routes/                    ← pages (+page/+layout), guards in +layout.ts / +page.ts
├── lib/features/orders/       ← example feature: api, components, model, locales, permissions
├── lib/shared/                ← api, auth, rbac, i18n, charts, ui, lib, config
└── mocks/                     ← MSW handlers (dev + tests)
```

Security: the session is an HttpOnly cookie handled by the BFF (`/api/auth/*`); the browser never
sees tokens. CSP with per-request nonce (`csp` in `vite.config.ts`) and security headers in
`src/hooks.server.ts`.
