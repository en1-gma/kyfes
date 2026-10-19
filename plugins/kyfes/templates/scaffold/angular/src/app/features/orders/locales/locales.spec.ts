import { parityKeys } from '@shared/i18n';
import enLocale from './en.json';
import itLocale from './it.json';

describe('i18n orders', () => {
  it('it.json ed en.json hanno le stesse chiavi', () => {
    expect(parityKeys(enLocale)).toEqual(parityKeys(itLocale));
  });
});
