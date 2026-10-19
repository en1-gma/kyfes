import enLocale from './locales/en.json';
import itLocale from './locales/it.json';
import { flattenKeys, parityKeys } from './locale-keys';

describe('i18n common', () => {
  it('it.json ed en.json hanno le stesse chiavi', () => {
    expect(parityKeys(enLocale)).toEqual(parityKeys(itLocale));
  });

  it('flattenKeys elenca le chiavi annidate', () => {
    expect(flattenKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual(['a.b', 'a.c.d', 'e']);
  });

  it('parityKeys ignora le categorie di plurale in più di una lingua', () => {
    const en = { items: { count_one: '{{count}} item', count_other: '{{count}} items' } };
    const pl = {
      items: {
        count_one: '1 element',
        count_few: 'elementy',
        count_many: 'elementów',
        count_other: 'elementu',
      },
    };
    expect(parityKeys(pl)).toEqual(parityKeys(en));
    expect(parityKeys(en)).toEqual(['items.count']);
  });
});
