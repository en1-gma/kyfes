import {
  DOCUMENT,
  type EnvironmentProviders,
  Injectable,
  type Provider,
  type Signal,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type Translation,
  type TranslocoLoader,
  TranslocoService,
  getBrowserLang,
  provideTransloco,
  provideTranslocoScope,
} from '@jsverse/transloco';
import { type Locale, SUPPORTED_LOCALES, env } from '@shared/config/env';

export type { Locale };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

const COMMON_LOADERS: Record<Locale, () => Promise<{ default: Translation }>> = {
  it: () => import('./locales/it.json'),
  en: () => import('./locales/en.json'),
};

/** Namespace `common` (radice): chiavi `common.*`. Caricato in lazy per lingua. */
@Injectable({ providedIn: 'root' })
export class CommonLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    const load = isLocale(lang) ? COMMON_LOADERS[lang] : COMMON_LOADERS[env.DEFAULT_LOCALE];
    const module = await load();
    return { common: module.default };
  }
}

/** Lingua iniziale: browser → default di config (la sessione la sovrascrive appena caricata). */
export function initialLocale(): Locale {
  const browser = typeof navigator === 'undefined' ? undefined : getBrowserLang();
  return isLocale(browser) ? browser : env.DEFAULT_LOCALE;
}

export function provideI18n(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LOCALES],
        defaultLang: initialLocale(),
        fallbackLang: env.DEFAULT_LOCALE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        // Chiavi sempre complete: `common.actions.save`, `orders.list.title`.
        scopes: { autoPrefixKeys: false },
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
      },
      loader: CommonLoader,
    }),
    provideEnvironmentInitializer(() => {
      const document = inject(DOCUMENT);
      inject(TranslocoService).langChanges$.subscribe((lang) => {
        document.documentElement.lang = lang;
      });
    }),
  ]);
}

/**
 * Namespace di una feature (`orders` → chiavi `orders.*`), caricato in lazy solo quando
 * la rotta che lo dichiara viene attivata. Uso: `providers: [provideI18nNamespace('orders', loaders)]`.
 */
export function provideI18nNamespace(
  namespace: string,
  loaders: Record<Locale, () => Promise<unknown>>,
): Provider[] {
  return provideTranslocoScope({
    scope: namespace,
    loader: loaders as Record<Locale, () => Promise<Translation>>,
  });
}

/** Lingua corrente e cambio lingua per i componenti (nessun import di Transloco fuori da qui). */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly transloco = inject(TranslocoService);
  readonly locales = SUPPORTED_LOCALES;
  readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  }) as Signal<Locale>;

  setLang(lang: string): void {
    if (isLocale(lang)) this.transloco.setActiveLang(lang);
  }

  translate(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(key, params);
  }
}
