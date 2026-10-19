import * as z from 'zod';

/**
 * Variabili pubbliche (finiscono nel bundle: mai segreti).
 * Angular non legge `.env`: i valori arrivano dall'opzione `define` di angular.json
 * (per configurazione) e sono validati qui. Unico punto in cui si leggono.
 */
declare const NG_APP_API_BASE_URL: string | undefined;
declare const NG_APP_DEFAULT_LOCALE: string | undefined;
declare const NG_APP_API_MOCKS: string | undefined;

export const SUPPORTED_LOCALES = ['it', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const EnvSchema = z.object({
  API_BASE_URL: z
    .string()
    .refine((v) => (v.startsWith('/') && !v.startsWith('//')) || v.startsWith('https://'), {
      message: 'API_BASE_URL deve essere un percorso relativo o un URL https',
    })
    .default('/api'),
  DEFAULT_LOCALE: z.enum(SUPPORTED_LOCALES).default('it'),
  API_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse({
  API_BASE_URL: typeof NG_APP_API_BASE_URL === 'undefined' ? undefined : NG_APP_API_BASE_URL,
  DEFAULT_LOCALE: typeof NG_APP_DEFAULT_LOCALE === 'undefined' ? undefined : NG_APP_DEFAULT_LOCALE,
  API_MOCKS: typeof NG_APP_API_MOCKS === 'undefined' ? undefined : NG_APP_API_MOCKS,
});
