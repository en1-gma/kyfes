import { describe, expect, it } from 'vitest';
import commonEn from './locales/en.json';
import commonIt from './locales/it.json';
import ordersEn from '../../features/orders/locales/en.json';
import ordersIt from '../../features/orders/locales/it.json';

const keys = (catalog: Record<string, unknown>) =>
	Object.keys(catalog)
		.filter((key) => key !== '$schema')
		.sort();

describe('i18n catalogs', () => {
	it.each([
		['common', commonIt, commonEn, 'common_'],
		['orders', ordersIt, ordersEn, 'orders_']
	])('%s: same keys in it and en, all with the namespace prefix', (_name, it_, en, prefix) => {
		expect(keys(en)).toEqual(keys(it_));
		expect(keys(it_).every((key) => key.startsWith(prefix))).toBe(true);
	});
});
