import { z } from 'zod';

/**
 * Zod schemas of the public variables (declared in src/env.ts, SvelteKit 3 `defineEnvVars`).
 * PUBLIC_ prefix kept on purpose: anything public ends up in the browser bundle, never secrets.
 */
export const publicEnvSchemas = {
	PUBLIC_API_BASE_URL: z
		.string()
		.optional()
		.transform((value) => value || '/api')
		.pipe(z.string().startsWith('/')),
	PUBLIC_DEFAULT_LOCALE: z
		.enum(['it', 'en'])
		.optional()
		.transform((value) => value ?? 'it'),
	PUBLIC_API_MOCKS: z
		.enum(['true', 'false', ''])
		.optional()
		.transform((value) => value === 'true')
};
