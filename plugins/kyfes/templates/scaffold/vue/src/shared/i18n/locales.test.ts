import { describe, expect, it } from 'vitest'

/** Every locale file (common + every feature namespace) must have the same keys in every language. */
const files = import.meta.glob<{ default: Record<string, unknown> }>('/src/**/locales/*.json', {
  eager: true,
})

/** Plural suffixes (`key_one`, `key_other`, …): languages may have different plural categories. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

function keysOf(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix.replace(PLURAL_SUFFIX, '')]
  return Object.entries(value).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k))
}

const byFolder = new Map<string, Map<string, string[]>>()
for (const [path, mod] of Object.entries(files)) {
  const folder = path.slice(0, path.lastIndexOf('/'))
  const lang = path.slice(path.lastIndexOf('/') + 1, -'.json'.length)
  const langs = byFolder.get(folder) ?? new Map<string, string[]>()
  langs.set(lang, [...new Set(keysOf(mod.default))].sort())
  byFolder.set(folder, langs)
}

describe('locale key parity', () => {
  it('finds common and orders namespaces', () => {
    expect([...byFolder.keys()]).toEqual(
      expect.arrayContaining(['/src/shared/i18n/locales', '/src/features/orders/locales']),
    )
  })

  it.each([...byFolder.entries()])('%s: it and en have the same keys', (_folder, langs) => {
    expect(langs.get('en')).toEqual(langs.get('it'))
    expect(langs.get('it')?.length).toBeGreaterThan(0)
  })
})
