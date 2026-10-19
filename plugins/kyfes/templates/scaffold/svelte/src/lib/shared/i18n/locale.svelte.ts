import { browser } from '$app/env';
import { env } from '$lib/shared/config';
import {
	extractLocaleFromCookie,
	extractLocaleFromNavigator,
	getLocale,
	isLocale,
	locales,
	setLocale,
	type Locale
} from './paraglide/runtime';

export { locales, type Locale };

/**
 * Reactive mirror of Paraglide's locale. The app is client-rendered (ssr = false), so the
 * locale changes without reloading: <LocaleBoundary> re-renders the tree on change.
 */
export const localeState = $state<{ current: Locale }>({ current: getLocale() });

function apply(locale: Locale): void {
	if (getLocale() !== locale) void setLocale(locale, { reload: false });
	localeState.current = locale;
	if (browser) document.documentElement.lang = locale;
}

/** Explicit user choice (persisted by Paraglide's cookie strategy). */
export function changeLocale(locale: Locale): void {
	apply(locale);
}

/**
 * Initial locale: explicit choice (cookie) → session → navigator.language → PUBLIC_DEFAULT_LOCALE.
 */
export function initLocale(sessionLocale?: string | null): Locale {
	const locale =
		extractLocaleFromCookie() ??
		(isLocale(sessionLocale) ? sessionLocale : undefined) ??
		(browser ? extractLocaleFromNavigator() : undefined) ??
		env.DEFAULT_LOCALE;
	apply(locale);
	return locale;
}
