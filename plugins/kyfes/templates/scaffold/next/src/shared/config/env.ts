import { z } from 'zod';

/** Supported locales; the first one is the default when NEXT_PUBLIC_DEFAULT_LOCALE is unset. */
export const LOCALES = ['it', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Boolean env flags are the strings `'true'` / `'false'`. */
const FLAG = { on: 'true', off: 'false' } as const;

/** Same-origin path ("/api", never protocol-relative "//host", no backslashes) or an https URL. */
export function isValidApiBaseUrl(value: string): boolean {
  if (value.includes('\\')) return false;
  if (value.startsWith('/')) return !value.startsWith('//');
  return value.startsWith('https://');
}

const EnvSchema = z.object({
  API_BASE_URL: z
    .string()
    .min(1)
    .refine(isValidApiBaseUrl, {
      message: 'API_BASE_URL must be a same-origin path or an https URL',
    })
    .default('/api'),
  DEFAULT_LOCALE: z.enum(LOCALES).default(LOCALES[0]),
  API_MOCKS: z
    .enum([FLAG.on, FLAG.off])
    .default(FLAG.off)
    .transform((v) => v === FLAG.on),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Public configuration. Next inlines only literal `process.env.NEXT_PUBLIC_*` accesses,
 * so every variable is listed explicitly. Empty strings fall back to defaults.
 */
export const env: Env = EnvSchema.parse({
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || undefined,
  DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || undefined,
  API_MOCKS: process.env.NEXT_PUBLIC_API_MOCKS || undefined,
});
