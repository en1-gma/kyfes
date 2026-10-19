/// <reference types="vitest/config" />
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { msw } from 'msw/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	// Dev only: the MSW plugin serves /mockServiceWorker.js, nothing is emitted in the build.
	const mswDev: Plugin = { ...msw({ mode: 'worker-only' }), apply: 'serve' };

	return {
		plugins: [
			sveltekit({
				// adapter-node: every HTML response goes through hooks.server.ts, so the CSP nonce
				// is per request and the security headers are set in one place.
				adapter: adapter(),
				// SvelteKit 3 no longer generates $lib (the new default is the #lib subpath import).
				// The kyfes presets and arch_check resolve `$lib/` → src/lib, so it is declared here.
				alias: { $lib: 'src/lib' },
				csp: {
					mode: 'auto',
					directives: {
						'default-src': ['self'],
						'script-src': ['self', 'strict-dynamic'],
						'style-src': ['self'],
						'img-src': ['self', 'data:'],
						'font-src': ['self'],
						'connect-src': ['self'],
						'worker-src': ['self'],
						'object-src': ['none'],
						'base-uri': ['none'],
						'form-action': ['self'],
						'frame-ancestors': ['none']
					}
				}
			}),
			paraglideVitePlugin({
				project: './project.inlang',
				outdir: './src/lib/shared/i18n/paraglide',
				emitTsDeclarations: true,
				strategy: ['cookie', 'preferredLanguage', 'baseLocale']
			}),
			...(process.env.VITEST ? [] : [mswDev]),
			svelteTesting()
		],
		server: {
			proxy: {
				// Dev proxy to the BFF: same-origin calls, the session cookie stays HttpOnly.
				'/api': { target: env.API_ORIGIN ?? 'http://localhost:8080', changeOrigin: true }
			}
		},
		build: { sourcemap: false },
		test: {
			environment: 'jsdom',
			include: ['src/**/*.test.ts'],
			setupFiles: ['./src/mocks/sveltekit-globals.ts', './src/mocks/vitest-setup.ts'],
			restoreMocks: true,
			// No persistent module cache: a stale transform (e.g. after adding locale files)
			// would make tests fail for reasons unrelated to the code.
			fsModuleCache: false,
			server: { deps: { inline: ['msw'] } },
			alias: {
				// svelteTesting() adds the `browser` condition (Svelte client runtime in jsdom), which maps
				// this Node-only MSW interceptor to `null`: point it to the Node build explicitly.
				'@mswjs/interceptors/ClientRequest': fileURLToPath(
					new URL(
						'./node_modules/@mswjs/interceptors/lib/node/interceptors/ClientRequest/index.js',
						import.meta.url
					)
				)
			}
		}
	};
});
