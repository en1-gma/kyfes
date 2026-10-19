import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import pluginQuery from '@tanstack/eslint-plugin-query';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...pluginQuery.configs['flat/recommended'],
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'react/no-danger': 'error',
      'react/jsx-no-target-blank': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Use the http client from @/shared/api.' },
            { name: 'recharts', message: 'Use the wrappers from @/shared/charts.' },
            { name: 'dompurify', message: 'Use sanitizeHtml from @/shared/lib.' },
            { name: 'next-intl', message: 'Use the re-exports from @/shared/i18n.' },
            { name: '@casl/react', message: 'Use Can/useAbility from @/shared/rbac.' },
            { name: '@casl/ability', message: 'Use the re-exports from @/shared/rbac.' },
          ],
        },
      ],
    },
  },
  {
    // The only places allowed to import the libraries above (kyfes boundaries).
    files: [
      'src/shared/**',
      'src/app/layout.tsx',
      'src/app/providers.tsx',
      'src/mocks/**',
      'src/test/**',
      '**/*.test.{ts,tsx}',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'public/mockServiceWorker.js',
    'next-env.d.ts',
  ]),
]);
