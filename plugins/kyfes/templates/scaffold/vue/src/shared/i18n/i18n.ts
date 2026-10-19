import { createI18n, useI18n } from 'vue-i18n'
import { COMMON_NS, FALLBACK_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/shared/config/constants'
import { env } from '@/shared/config/env'
import commonIt from './locales/it.json'
import commonEn from './locales/en.json'

export { COMMON_NS } from '@/shared/config/constants'

type Messages = Record<string, unknown>
export type NamespaceLoaders = Record<Locale, () => Promise<{ default: Messages }>>

declare module 'vue-router' {
  interface RouteMeta {
    /** Feature namespaces to load before entering the route (e.g. ['orders']). */
    namespaces?: string[]
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: env.DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  // `common` is small and always needed: bundled. Feature namespaces are lazy.
  messages: { it: { [COMMON_NS]: commonIt }, en: { [COMMON_NS]: commonEn } },
  missingWarn: import.meta.env.DEV,
  fallbackWarn: false,
})

const registry = new Map<string, NamespaceLoaders>()
const loaded = new Set<string>()
const active = new Set<string>()

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function currentLocale(): Locale {
  const value = i18n.global.locale.value
  return isLocale(value) ? value : env.DEFAULT_LOCALE
}

/** Features register their locale loaders (lazy `import('./locales/<l>.json')`) from app/. */
export function registerNamespace(namespace: string, loaders: NamespaceLoaders): void {
  registry.set(namespace, loaders)
}

/** Loads the given namespaces for a locale (only once per locale/namespace). */
export async function loadNamespaces(namespaces: readonly string[], locale: Locale = currentLocale()) {
  await Promise.all(
    namespaces.map(async (ns) => {
      active.add(ns)
      const id = `${locale}:${ns}`
      const loader = registry.get(ns)?.[locale]
      if (loaded.has(id) || !loader) return
      const mod = await loader()
      i18n.global.mergeLocaleMessage(locale, { [ns]: mod.default })
      loaded.add(id)
    }),
  )
}

/** Switches language: loads the namespaces in use, then updates vue-i18n and `<html lang>`. */
export async function setLocale(locale: Locale): Promise<void> {
  await loadNamespaces([...active], locale)
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
}

/** Initial language: session → browser → config default. */
export function resolveInitialLocale(sessionLocale?: string | null): Locale {
  if (isLocale(sessionLocale)) return sessionLocale
  const browser = typeof navigator === 'undefined' ? undefined : navigator.language.slice(0, 2)
  return isLocale(browser) ? browser : env.DEFAULT_LOCALE
}

/** Translation for components: `const { t } = useT()` then `t('orders.list.title')`. `te` = key exists. */
export function useT() {
  const { t, te, locale } = useI18n()
  return { t, te, locale }
}
