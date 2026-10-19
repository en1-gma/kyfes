---
name: kyfes-review
description: Independent review of frontend changes against kyfes rules (security, cookie sessions, CSRF/XSS, layout, HTTP client, TanStack Query, CASL RBAC on CRUD, i18n, charts, accessibility, tests). Use after implementing a change, before committing or opening a PR — in Codex it replaces the kyfes:reviewer agent.
---

# Review frontend changes with kyfes

Review as if you had not written the code. Do not modify files during the review.

1. Load the `kyfes-architecture` rules and `references/<framework>.md`.
2. Find the changes: `git diff` and `git diff --staged` (or the files named by the user).
3. Run the automatic checks and report their output:
   - `python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py . --strict`
   - every command in `stop_gate.commands` of `.kyfes/config.json` (lint, typecheck, tests).
4. Go through the review checklist (section 10 of the skill) and the items automation cannot see: session data in URLs or global state; create/update payloads with fields the user may not write; edit routes without a check on the record; loading/error/empty, pagination or confirm markup copied instead of `QueryState`/`LoadMore`/`ConfirmDeleteDialog`; redirects without `safeRedirect`; user URLs in `href`/`src` without `safeUrl`; `postMessage` without origin check; responses not parsed with Zod; hand-written query keys; mutations without invalidation; CRUD actions shown without `can()`; client-side permission flags; unhandled 403; untranslated toasts/errors; formatting without `Intl`; charts without a text alternative; inputs without labels or keyboard access; RBAC tests covering a single profile.
5. Answer with:
   - **Outcome**: APPROVED or CHANGES REQUIRED
   - **Blocking violations** (rule, file:line, proposed fix)
   - **Non-blocking notes**
