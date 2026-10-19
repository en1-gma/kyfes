import { describe, expect, it } from 'vitest';
import commonEn from './locales/en.json';
import commonIt from './locales/it.json';
import ordersEn from '../../features/orders/locales/en.json';
import ordersIt from '../../features/orders/locales/it.json';

/** Plural suffixes are dropped: a language with more plural categories still has the same keys. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

const keys = (catalog: Record<string, unknown>) =>
	[
		...new Set(
			Object.keys(catalog)
				.filter((key) => key !== '$schema')
				.map((key) => key.replace(PLURAL_SUFFIX, ''))
		)
	].sort();

describe('i18n catalogs', () => {
	it.each([
		['common', commonIt, commonEn, 'common_'],
		['orders', ordersIt, ordersEn, 'orders_']
	])('%s: same keys in it and en, all with the namespace prefix', (_name, it_, en, prefix) => {
		expect(keys(en)).toEqual(keys(it_));
		expect(keys(it_).every((key) => key.startsWith(prefix))).toBe(true);
	});

	it('ignores plural suffixes when comparing the keys', () => {
		const en = { orders_item_one: 'item', orders_item_other: 'items' };
		const pl = {
			orders_item_one: 'a',
			orders_item_few: 'b',
			orders_item_many: 'c',
			orders_item_other: 'd'
		};
		expect(keys(pl)).toEqual(keys(en));
	});
});
