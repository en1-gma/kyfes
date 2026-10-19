// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: [
      'dist/',
      '.angular/',
      'coverage/',
      'out-tsc/',
      'playwright-report/',
      'test-results/',
      'public/mockServiceWorker.js',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      // Componenti/pagine senza logica sono classi vuote decorate: idioma Angular.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      // `output<void>()` è l'idioma Angular per gli eventi senza payload.
      '@typescript-eslint/no-invalid-void-type': 'off',
      'no-console': ['error', { allow: ['error', 'warn'] }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^bypassSecurityTrust/]',
          message: 'bypassSecurityTrust* è vietato: usa sanitizeHtml() di shared/lib.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['axios'],
              message: 'Il client HTTP è HttpClient incapsulato in shared/api (ApiClient).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/shared/ui/button.component.ts'],
    rules: {
      // Selettore di attributo (`button[appButton]`): mantiene l'elemento nativo (accessibilità).
      '@angular-eslint/component-selector': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
