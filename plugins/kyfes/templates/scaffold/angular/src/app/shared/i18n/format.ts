import { Pipe, type PipeTransform, inject } from '@angular/core';
import { DEFAULT_CURRENCY } from '@shared/config/constants';
import { I18nService } from './i18n';

export { DEFAULT_CURRENCY } from '@shared/config/constants';

export type DateInput = string | number | Date;

/** Formattazioni solo con Intl e la lingua corrente: mai a mano. */
export function formatDate(
  value: DateInput,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatNumber(value: number, locale: string, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(value: number, locale: string, currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/** Pipe impure: si ricalcolano al cambio lingua (signal). */
@Pipe({ name: 'localeDate', pure: false })
export class LocaleDatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  transform(value: DateInput, options?: Intl.DateTimeFormatOptions): string {
    return formatDate(value, this.i18n.lang(), options);
  }
}

@Pipe({ name: 'localeNumber', pure: false })
export class LocaleNumberPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  transform(value: number, options?: Intl.NumberFormatOptions): string {
    return formatNumber(value, this.i18n.lang(), options);
  }
}

@Pipe({ name: 'localeCurrency', pure: false })
export class LocaleCurrencyPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  transform(value: number, currency = DEFAULT_CURRENCY): string {
    return formatCurrency(value, this.i18n.lang(), currency);
  }
}
