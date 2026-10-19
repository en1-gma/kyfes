---
name: kyfes-plan
description: Plan a frontend feature or change according to kyfes (layout, API contract with Zod, TanStack Query keys and invalidations, CASL RBAC matrix for CRUD, i18n keys, security analysis, tests). Use before writing code for a new page, feature, API call, permission or form — especially in Codex, where it replaces the kyfes:architect agent.
---

# Plan a change with kyfes

You are acting as the frontend architect. Do not write code in this step.

1. Load the rules of the `kyfes-architecture` skill (read its `SKILL.md`) and `references/<framework>.md` for the framework in `.kyfes/config.json`.
2. Explore what already exists: `features/*/index.ts`, the subjects registered in `shared/rbac`, `shared/api`, `shared/ui`, `shared/lib`, the routes.
3. Write the plan in the mandatory format (section 9 of the skill):
   1. feature and files (canonical layout);
   2. API contract with Zod schemas, cursor pagination, expected errors;
   3. queries and mutations with key-factory keys, invalidations, optimistic updates;
   4. RBAC matrix: every route, button, column and field → CASL action + subject;
   5. new i18n keys in every configured language;
   6. security: rendered user input, external URLs, redirects, uploads, sensitive data;
   7. tests: unit, RBAC (same view, different abilities), 401/403/5xx, e2e with axe;
   8. violations and compliant alternatives.
4. End with small, independent tasks, each with its files. In Codex, run each task with the `kyfes_implementer` agent if available, otherwise implement it yourself following `kyfes-architecture`; finish with `$kyfes-review`.
