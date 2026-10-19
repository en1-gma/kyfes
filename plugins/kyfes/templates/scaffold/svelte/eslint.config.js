import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'coverage/',
			'playwright-report/',
			'test-results/',
			'src/lib/shared/i18n/paraglide/'
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{ 'ts-expect-error': 'allow-with-description' }
			],
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'no-restricted-imports': [
				'error',
				{
					paths: [{ name: '$app/stores', message: 'Removed in SvelteKit 3: use $app/state.' }]
				}
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: { projectService: false, extraFileExtensions: ['.svelte'], parser: ts.parser }
		},
		rules: {
			'svelte/no-at-html-tags': 'error',
			'svelte/no-target-blank': 'error'
		}
	}
);
