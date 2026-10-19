import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '@/shared/config';

type Json = Record<string, unknown>;

const common = import.meta.glob<Json>('./locales/*.json', { eager: true, import: 'default' });
const features = import.meta.glob<Json>('../../features/*/locales/*.json', {
  eager: true,
  import: 'default',
});

function flatKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? flatKeys(value as Json, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function byNamespace(): Map<string, Map<string, Json>> {
  const out = new Map<string, Map<string, Json>>();
  const add = (ns: string, lng: string, data: Json) => {
    const entry = out.get(ns) ?? new Map<string, Json>();
    entry.set(lng, data);
    out.set(ns, entry);
  };
  for (const [path, data] of Object.entries(common))
    add('common', path.split('/').at(-1)!.replace('.json', ''), data);
  for (const [path, data] of Object.entries(features)) {
    const parts = path.split('/');
    add(parts.at(-3)!, parts.at(-1)!.replace('.json', ''), data);
  }
  return out;
}

const namespaces = byNamespace();

describe('locale files', () => {
  it('include common and orders', () => {
    expect([...namespaces.keys()]).toEqual(expect.arrayContaining(['common', 'orders']));
  });

  describe.each([...namespaces.entries()])('namespace %s', (_ns, files) => {
    it('exists in every supported locale', () => {
      expect([...files.keys()].sort()).toEqual([...SUPPORTED_LOCALES].sort());
    });

    it('has the same keys in every locale', () => {
      const [reference, ...others] = SUPPORTED_LOCALES.map((lng) => flatKeys(files.get(lng) ?? {}).sort());
      for (const keys of others) expect(keys).toEqual(reference);
    });

    it('has no empty strings', () => {
      for (const data of files.values()) {
        const empty = flatKeys(data).filter((key) => {
          const value = key.split('.').reduce<unknown>((acc, k) => (acc as Json | undefined)?.[k], data);
          return typeof value !== 'string' || value.trim() === '';
        });
        expect(empty).toEqual([]);
      }
    });
  });
});
