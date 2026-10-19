import type { Locale } from './config';

export type DateInput = Date | string | number;

const DEFAULT_CURRENCY = 'EUR';

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Date presets shared by every screen: `formatDate(value, DATE_FORMAT.dateTime)`. */
export const DATE_FORMAT = {
  date: { dateStyle: 'medium' },
  dateTime: { dateStyle: 'long', timeStyle: 'short' },
  monthYear: { month: 'short', year: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export function formatDate(
  value: DateInput,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = DATE_FORMAT.date,
): string {
  return new Intl.DateTimeFormat(locale, options).format(toDate(value));
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(value: number, locale: Locale, currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
