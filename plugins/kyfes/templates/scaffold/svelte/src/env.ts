import { defineEnvVars } from '@sveltejs/kit/env';
import { publicEnvSchemas } from '$lib/shared/config/env.schema';

/**
 * SvelteKit 3 explicit environment variables. Read them only through
 * shared/config/env.ts. `static`: inlined at build time (dead-code elimination of the mocks).
 */
export const variables = defineEnvVars({
	PUBLIC_API_BASE_URL: {
		public: true,
		static: true,
		schema: publicEnvSchemas.PUBLIC_API_BASE_URL,
		description: 'Base path of the BFF API (same origin).'
	},
	PUBLIC_DEFAULT_LOCALE: {
		public: true,
		static: true,
		schema: publicEnvSchemas.PUBLIC_DEFAULT_LOCALE,
		description: 'Fallback locale (it | en).'
	},
	PUBLIC_API_MOCKS: {
		public: true,
		static: true,
		schema: publicEnvSchemas.PUBLIC_API_MOCKS,
		description: 'Dev only: serve /api with MSW in the browser.'
	}
});
