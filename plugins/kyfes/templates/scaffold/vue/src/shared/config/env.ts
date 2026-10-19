import { z } from 'zod'

/** Supported UI languages. The first one is the fallback. */
export const SUPPORTED_LOCALES = ['it', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/** Boolean flags arrive from Vite as strings. */
const FLAG = { on: 'true', off: 'false' } as const

const EnvSchema = z.object({
  API_BASE_URL: z
    .string()
    .default('/api')
    // Same-origin path only: the CSP (deploy/security-headers.conf) allows `connect-src 'self'` and the
    // session cookie is first-party. Cross-origin APIs go behind the reverse proxy, never in the bundle.
    .refine(
      (v) => v.startsWith('/') && !v.startsWith('//') && !v.includes('\\'),
      'API_BASE_URL must be a same-origin path starting with "/" (e.g. /api)',
    ),
  DEFAULT_LOCALE: z.enum(SUPPORTED_LOCALES).default(SUPPORTED_LOCALES[0]),
  API_MOCKS: z
    .enum([FLAG.on, FLAG.off])
    .default(FLAG.off)
    .transform((v) => v === FLAG.on),
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
