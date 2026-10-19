const ALLOWED_PROTOCOLS = new Set(['https:', 'mailto:', 'tel:']);
// eslint-disable-next-line no-control-regex -- si cercano proprio i caratteri di controllo
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * URL forniti dall'utente: ammessi solo `https:`, `mailto:`, `tel:` e percorsi relativi.
 * Restituisce l'URL normalizzato oppure `null` (mai `javascript:`, `data:`, `http:`…).
 */
export function safeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (value.length === 0 || CONTROL_CHARS.test(value) || value.includes('\\')) return null;
  if (value.startsWith('//')) return null;
  if (
    value.startsWith('/') ||
    value.startsWith('./') ||
    value.startsWith('../') ||
    value.startsWith('#') ||
    value.startsWith('?')
  ) {
    return value;
  }
  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
