import { currentLocale } from './i18n'

/** Reads the reactive locale: formatted values re-render when the language changes. */
export function formatDate(value: Date | string | number, options: Intl.DateTimeFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', ...options }).format(date)
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(currentLocale(), options).format(value)
}

export function formatCurrency(
  value: number,
  currency = 'EUR',
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency, ...options }).format(value)
}

/** Short month label for chart axes ("2026-03" → "mar 2026"). */
export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  if (!year || !month) return yearMonth
  return new Intl.DateTimeFormat(currentLocale(), { month: 'short', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  )
}
