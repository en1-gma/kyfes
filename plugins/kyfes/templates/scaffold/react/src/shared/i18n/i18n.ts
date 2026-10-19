import i18next, { type BackendModule, type ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { env, SUPPORTED_LOCALES, type Locale } from '@/shared/config';

export const DEFAULT_NS = 'common';

type JsonModule = { default: ResourceKey };

// Lazy loaders: `common` lives here, every feature keeps its namespace in
// `features/<feature>/locales/<lng>.json` (namespace = feature folder name). Each file is a
// separate chunk, fetched only when a component asks for that namespace.
const commonLoaders = import.meta.glob<JsonModule>('./locales/*.json');
const featureLoaders = import.meta.glob<JsonModule>('../../features/*/locales/*.json');

function loaderFor(lng: string, ns: string): (() => Promise<JsonModule>) | undefined {
  if (ns === DEFAULT_NS) return commonLoaders[`./locales/${lng}.json`];
  return featureLoaders[`../../features/${ns}/locales/${lng}.json`];
}

/** Namespaces available on disk (used by the key-parity test). */
export const availableNamespaces: readonly string[] = [
  DEFAULT_NS,
  ...new Set(
    Object.keys(featureLoaders)
      .map((path) => path.split('/').at(-3) ?? '')
      .filter((ns) => ns !== ''),
  ),
];

const lazyBackend: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read(language, namespace, callback) {
    const load = loaderFor(language, namespace);
    if (!load) {
      callback(new Error(`Missing locale file: ${namespace}/${language}`), false);
      return;
    }
    load().then(
      (mod) => {
        callback(null, mod.default);
      },
      (error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)), false);
      },
    );
  },
};

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** `en-GB` → `en` if supported. */
export function toSupportedLocale(value: string | null | undefined): Locale | undefined {
  const base = value?.toLowerCase().split('-')[0];
  return isSupportedLocale(base) ? base : undefined;
}

/** Initial language before the session arrives: browser → config default (kyfes §6). */
function initialLocale(): Locale {
  const fromBrowser = typeof navigator === 'undefined' ? undefined : toSupportedLocale(navigator.language);
  return fromBrowser ?? env.DEFAULT_LOCALE;
}

export const i18n = i18next.createInstance();

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
});

let initPromise: Promise<unknown> | undefined;

export function initI18n(lng: Locale = initialLocale()): Promise<unknown> {
  initPromise ??= i18n
    .use(lazyBackend)
    .use(initReactI18next)
    .init({
      lng,
      fallbackLng: env.DEFAULT_LOCALE,
      supportedLngs: [...SUPPORTED_LOCALES],
      load: 'languageOnly',
      ns: [DEFAULT_NS],
      defaultNS: DEFAULT_NS,
      fallbackNS: DEFAULT_NS,
      // React escapes on render: double escaping would show entities.
      interpolation: { escapeValue: false },
      returnNull: false,
      react: { useSuspense: true },
    });
  return initPromise;
}

/** Language from the session (`/auth/me` → `locale`) wins over the browser one. */
export async function changeLocale(locale: string | null | undefined): Promise<void> {
  const next = toSupportedLocale(locale);
  if (next && next !== i18n.resolvedLanguage) await i18n.changeLanguage(next);
}

export function currentLocale(): Locale {
  return toSupportedLocale(i18n.resolvedLanguage ?? i18n.language) ?? env.DEFAULT_LOCALE;
}
