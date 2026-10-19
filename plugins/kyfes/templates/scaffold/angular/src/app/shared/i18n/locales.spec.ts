import enLocale from './locales/en.json';
import itLocale from './locales/it.json';
import { flattenKeys } from './locale-keys';

describe('i18n common', () => {
  it('it.json ed en.json hanno le stesse chiavi', () => {
    expect(flattenKeys(enLocale)).toEqual(flattenKeys(itLocale));
  });

  it('flattenKeys elenca le chiavi annidate', () => {
    expect(flattenKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual(['a.b', 'a.c.d', 'e']);
  });
});
