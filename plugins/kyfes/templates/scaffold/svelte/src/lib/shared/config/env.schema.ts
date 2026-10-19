import { z } from 'zod';
import { DEFAULT_API_BASE_URL, DEFAULT_LOCALE, ENV_FLAG, SUPPORTED_LOCALES } from './constants';

/**
 * Zod schemas of the public variables (declared in src/env.ts, SvelteKit 3 `defineEnvVars`).
 * PUBLIC_ prefix kept on purpose: anything public ends up in the browser bundle, never secrets.
 */
export const publicEnvSchemas = {
	PUBLIC_API_BASE_URL: z
		.string()
		.optional()
		.transform((value) => value || DEFAULT_API_BASE_URL)
		.pipe(z.string().startsWith('/')),
	PUBLIC_DEFAULT_LOCALE: z
		.enum(SUPPORTED_LOCALES)
		.optional()
		.transform((value) => value ?? DEFAULT_LOCALE),
	PUBLIC_API_MOCKS: z
		.enum([ENV_FLAG.on, ENV_FLAG.off, ''])
		.optional()
		.transform((value) => value === ENV_FLAG.on)
};
