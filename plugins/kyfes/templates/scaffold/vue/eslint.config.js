import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'
import prettier from 'eslint-config-prettier/flat'
import globals from 'globals'
import { defineConfig } from 'eslint/config'

export default defineConfig(
  { ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'public/**'] },
  js.configs.recommended,
  tseslint.configs.strict,
  pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'], sourceType: 'module' },
      globals: { ...globals.browser },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/no-v-html': 'error',
      'vue/require-v-for-key': 'error',
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/component-api-style': ['error', ['script-setup']],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Use the client exported by @/shared/api.' },
            { name: 'dompurify', message: 'Use sanitizeHtml from @/shared/lib.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/api/**', 'src/shared/lib/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['vite.config.ts', 'playwright.config.ts', 'eslint.config.js', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
)
