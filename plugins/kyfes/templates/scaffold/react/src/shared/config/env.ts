import { z } from 'zod';

/** Language used when `VITE_DEFAULT_LOCALE` is not set. */
const FALLBACK_LOCALE = 'it';

/** Locales the UI ships with. Add a language here and a `locales/<lng>.json` in every namespace. */
export const SUPPORTED_LOCALES = [FALLBACK_LOCALE, 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Value of an enabled boolean flag (`VITE_*=true`); `false` or empty disable it. */
const FLAG_ON = 'true';

const booleanFlag = z
  .enum([FLAG_ON, 'false', ''])
  .optional()
  .transform((v) => v === FLAG_ON);

/**
 * Public, build-time variables (prefix `VITE_`): they end up in the bundle, so they never hold
 * secrets or tokens (kyfes §3.4). This is the only file that reads `import.meta.env`.
 */
const EnvSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .default('/api')
    .refine((v) => v.startsWith('/') || v.startsWith('https://'), {
      message: 'VITE_API_BASE_URL must be a same-origin path or an https:// URL',
    }),
  VITE_DEFAULT_LOCALE: z.enum(SUPPORTED_LOCALES).default(FALLBACK_LOCALE),
  VITE_API_MOCKS: booleanFlag,
});

const parsed = EnvSchema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(`Invalid public environment variables: ${z.prettifyError(parsed.error)}`);
}

export const env = Object.freeze({
  API_BASE_URL: parsed.data.VITE_API_BASE_URL.replace(/\/+$/, ''),
  DEFAULT_LOCALE: parsed.data.VITE_DEFAULT_LOCALE,
  API_MOCKS: parsed.data.VITE_API_MOCKS,
  DEV: import.meta.env.DEV,
});

export type Env = typeof env;
