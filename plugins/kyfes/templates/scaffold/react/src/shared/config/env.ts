import { z } from 'zod';
import { FALLBACK_LOCALE, FLAG_OFF, FLAG_ON, SUPPORTED_LOCALES } from './constants';

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** `VITE_*=true` enables a flag; `false` or empty disable it. */
const booleanFlag = z
  .enum([FLAG_ON, FLAG_OFF, ''])
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
