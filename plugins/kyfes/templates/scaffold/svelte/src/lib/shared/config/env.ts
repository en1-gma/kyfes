import { PUBLIC_API_BASE_URL, PUBLIC_API_MOCKS, PUBLIC_DEFAULT_LOCALE } from '$app/env/public';

/**
 * The only place that reads environment variables. Values are validated with the Zod schemas
 * of env.schema.ts by SvelteKit (src/env.ts), so they are already typed here.
 */
export const env = {
	API_BASE_URL: PUBLIC_API_BASE_URL,
	DEFAULT_LOCALE: PUBLIC_DEFAULT_LOCALE,
	API_MOCKS: PUBLIC_API_MOCKS
} as const;

export type Env = typeof env;
