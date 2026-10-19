import { z } from 'zod'

/** Supported UI languages. The first one is the fallback. */
export const SUPPORTED_LOCALES = ['it', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const EnvSchema = z.object({
  API_BASE_URL: z
    .string()
    .default('/api')
    .refine((v) => v.startsWith('/') || v.startsWith('https://'), 'API_BASE_URL must be relative or https'),
  DEFAULT_LOCALE: z.enum(SUPPORTED_LOCALES).default('it'),
  API_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

export type Env = z.infer<typeof EnvSchema>

/** Public variables only (VITE_ prefix): they end up in the bundle, never put secrets here. */
export function parseEnv(source: Record<string, string | boolean | undefined>): Env {
  const pick = (key: string): string | undefined => {
    const value = source[key]
    return typeof value === 'string' && value !== '' ? value : undefined
  }
  return EnvSchema.parse({
    API_BASE_URL: pick('VITE_API_BASE_URL'),
    DEFAULT_LOCALE: pick('VITE_DEFAULT_LOCALE'),
    API_MOCKS: pick('VITE_API_MOCKS'),
  })
}

export const env: Env = parseEnv(import.meta.env)
