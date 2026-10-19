import { currentLocale } from './i18n';

/** Date, number and currency formatting only through Intl (kyfes §6). */

export function formatDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale: string = currentLocale(),
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale: string = currentLocale(),
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  value: number,
  currency = 'EUR',
  options: Intl.NumberFormatOptions = {},
  locale: string = currentLocale(),
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, ...options }).format(value);
}

/** `2026-03` → "mar 2026" / "Mar 2026". */
export function formatMonth(yearMonth: string, locale: string = currentLocale()): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  return formatDate(
    new Date(Date.UTC(year, month - 1, 1)),
    { month: 'short', year: 'numeric', timeZone: 'UTC' },
    locale,
  );
}
