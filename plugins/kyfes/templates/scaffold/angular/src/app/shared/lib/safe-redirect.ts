// eslint-disable-next-line no-control-regex -- si cercano proprio i caratteri di controllo
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const PLACEHOLDER_ORIGIN = 'https://redirect.invalid';

/**
 * Restituisce `target` solo se è un percorso relativo della stessa origine
 * (es. `/orders?x=1#top`), altrimenti `fallback`.
 * Rifiuta: URL assoluti e schemi (`https:`, `javascript:`), protocol-relative (`//host`),
 * backslash (`/\host`), caratteri di controllo.
 */
export function safeRedirect(target: unknown, fallback = '/'): string {
  if (typeof target !== 'string' || target.length === 0) return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  if (target.includes('\\') || CONTROL_CHARS.test(target)) return fallback;
  try {
    const url = new URL(target, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
