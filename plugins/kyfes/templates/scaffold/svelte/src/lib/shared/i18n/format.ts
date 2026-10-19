import { getLocale } from './paraglide/runtime';

/** Intl formatters bound to the current locale. Never format dates/numbers by hand. */

const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat>(
	key: string,
	create: () => T
): T {
	let formatter = cache.get(key) as T | undefined;
	if (!formatter) {
		formatter = create();
		cache.set(key, formatter);
	}
	return formatter;
}

export function formatDate(
	value: Date | string | number,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
	const locale = getLocale();
	const formatter = cached(
		`d|${locale}|${JSON.stringify(options)}`,
		() => new Intl.DateTimeFormat(locale, options)
	);
	return formatter.format(value instanceof Date ? value : new Date(value));
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
	const locale = getLocale();
	return cached(
		`n|${locale}|${JSON.stringify(options)}`,
		() => new Intl.NumberFormat(locale, options)
	).format(value);
}

export function formatCurrency(value: number, currency = 'EUR'): string {
	return formatNumber(value, { style: 'currency', currency });
}
