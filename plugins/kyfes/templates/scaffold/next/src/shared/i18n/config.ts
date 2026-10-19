import { COMMON_NS, LOCALE_COOKIE, TIME_ZONE } from '@/shared/config/constants';
import { env, LOCALES, type Locale } from '@/shared/config/env';

export { COMMON_NS, LOCALE_COOKIE, LOCALES, TIME_ZONE, type Locale };

export const DEFAULT_LOCALE: Locale = env.DEFAULT_LOCALE;

export type Messages = Record<string, unknown>;

/** A feature namespace (`features/<f>/locales/*.json`) loaded lazily per locale. */
export interface NamespaceLoader {
  namespace: string;
  load: (locale: Locale) => Promise<Messages>;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** First supported language of an Accept-Language header ("en-US,en;q=0.9" → "en"). */
export function matchAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag = '', q] = part.trim().split(';q=');
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return tags.map((t) => t.lang).find(isLocale);
}
