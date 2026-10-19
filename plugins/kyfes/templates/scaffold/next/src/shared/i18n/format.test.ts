import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber } from './format';
import { matchAcceptLanguage } from './config';

describe('Intl formatters', () => {
  it('formats per locale', () => {
    expect(formatNumber(1234.5, 'it')).toBe('1234,5');
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
    expect(formatCurrency(10, 'en')).toBe('€10.00');
    expect(formatDate('2026-03-05T10:00:00Z', 'en', { dateStyle: 'medium', timeZone: 'UTC' })).toBe(
      'Mar 5, 2026',
    );
  });

  it('matches Accept-Language against supported locales', () => {
    expect(matchAcceptLanguage('en-US,en;q=0.9,it;q=0.8')).toBe('en');
    expect(matchAcceptLanguage('fr-FR,it;q=0.5')).toBe('it');
    expect(matchAcceptLanguage('fr')).toBeUndefined();
  });
});
