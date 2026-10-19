/**
 * The only entry point to i18n for features and pages. Paraglide compiles one function per
 * message (message-modules): each route chunk only contains the messages it uses, so
 * feature namespaces (features/<f>/locales, prefix `<feature>_`) are loaded lazily with the route.
 */
export { m } from './paraglide/messages';
export { localeState, changeLocale, initLocale, locales, type Locale } from './locale.svelte';
export { formatDate, formatNumber, formatCurrency } from './format';
export { default as LocaleBoundary } from './LocaleBoundary.svelte';
export { default as LocaleSelect } from './LocaleSelect.svelte';
