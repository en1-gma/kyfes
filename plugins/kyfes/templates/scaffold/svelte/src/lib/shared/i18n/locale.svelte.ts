import { browser } from '$app/env';
import { env } from '$lib/shared/config';
import {
	extractLocaleFromCookie,
	extractLocaleFromNavigator,
	isLocale,
	locales,
	overwriteGetLocale,
	overwriteSetLocale,
	setLocale,
	type Locale
} from './paraglide/runtime';

export { locales, type Locale };

/** Paraglide's own setLocale: with the `cookie` strategy (reload: false) it only writes the cookie. */
const writeLocaleCookie = setLocale;

function navigatorLocale(): Locale | undefined {
	return browser ? extractLocaleFromNavigator() : undefined;
}

/**
 * Reactive source of the locale. Paraglide's getLocale() reads it, so every message (`m.x()`)
 * and Intl formatter called in a template or `$derived` re-runs on change: no remount of the
 * tree (form drafts and component state survive a language switch). Overwriting getLocale also
 * stops Paraglide from resolving the locale itself, which on first use wrote the cookie.
 */
export const localeState = $state<{ current: Locale }>({
	current: extractLocaleFromCookie() ?? navigatorLocale() ?? env.DEFAULT_LOCALE
});

overwriteGetLocale(() => localeState.current);
// Anyone calling Paraglide's setLocale directly makes an explicit choice too.
overwriteSetLocale((locale) => changeLocale(locale));

function apply(locale: Locale): void {
	localeState.current = locale;
}

/** Explicit user choice: the only place that writes the locale cookie. */
export function changeLocale(locale: Locale): void {
	apply(locale);
	void writeLocaleCookie(locale, { reload: false });
}

/**
 * Initial locale: explicit choice (cookie) → session → navigator.language → PUBLIC_DEFAULT_LOCALE.
 * Never writes the cookie, so a later session locale is not shadowed by an implicit choice.
 */
export function initLocale(sessionLocale?: string | null): Locale {
	const locale =
		extractLocaleFromCookie() ??
		(isLocale(sessionLocale) ? sessionLocale : undefined) ??
		navigatorLocale() ??
		env.DEFAULT_LOCALE;
	apply(locale);
	return locale;
}
