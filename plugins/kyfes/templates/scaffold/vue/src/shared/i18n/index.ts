export {
  i18n,
  useT,
  setLocale,
  loadNamespaces,
  registerNamespace,
  resolveInitialLocale,
  currentLocale,
  isLocale,
  type NamespaceLoaders,
} from './i18n'
export { formatDate, formatNumber, formatCurrency, formatMonth } from './format'
export { SUPPORTED_LOCALES, type Locale } from '@/shared/config/env'
