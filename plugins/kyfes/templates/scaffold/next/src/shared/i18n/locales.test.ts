import { describe, expect, it } from 'vitest';
import commonEn from './locales/en.json';
import commonIt from './locales/it.json';
import ordersEn from '@/features/orders/locales/en.json';
import ordersIt from '@/features/orders/locales/it.json';

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj)
    .flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
    .sort();
}

describe('locale key parity (it ⇄ en)', () => {
  it.each([
    ['common', commonIt, commonEn],
    ['orders', ordersIt, ordersEn],
  ])('%s has the same keys in every language', (_ns, it_, en) => {
    expect(keys(en)).toEqual(keys(it_));
  });
});
