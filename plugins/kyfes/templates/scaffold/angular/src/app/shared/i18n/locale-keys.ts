/** Elenco ordinato delle chiavi (a punti) di un file di locale: usato dai test di parità. */
export function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

const PLURAL_SUFFIX = /_(?:zero|one|two|few|many|other)$/;

/**
 * Chiavi per il confronto tra lingue: senza i suffissi plurali (`_one`, `_few`, …), così una lingua
 * con più categorie di plurale (es. `pl`) non risulta "diversa" da `it`/`en`.
 */
export function parityKeys(value: unknown): string[] {
  return [...new Set(flattenKeys(value).map((key) => key.replace(PLURAL_SUFFIX, '')))].sort();
}
