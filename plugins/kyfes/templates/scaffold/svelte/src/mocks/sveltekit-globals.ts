/**
 * SvelteKit 3 `$app/env/public` (dev build) reads `globalThis.__sveltekit_dev.env`, which only
 * the dev server injects into the page. Vitest has no page: provide it before any import.
 */
const globals = globalThis as typeof globalThis & {
	__sveltekit_dev?: { env: Record<string, string> };
};
globals.__sveltekit_dev ??= { env: {} };
