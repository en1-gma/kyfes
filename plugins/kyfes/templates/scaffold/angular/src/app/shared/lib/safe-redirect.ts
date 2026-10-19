// eslint-disable-next-line no-control-regex -- si cercano proprio i caratteri di controllo
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const PLACEHOLDER_ORIGIN = 'https://redirect.invalid';

/** `//host` o backslash: il browser li tratterebbe come un'altra origine. */
function isProtocolRelative(path: string): boolean {
  return path.startsWith('//') || path.includes('\\');
}

/**
 * Restituisce `target` solo se è un percorso relativo della stessa origine
 * (es. `/orders?x=1#top`), altrimenti `fallback`.
 * Rifiuta: URL assoluti e schemi (`https:`, `javascript:`), protocol-relative (`//host`),
 * backslash (`/\host`), caratteri di controllo. Il controllo è ripetuto DOPO la normalizzazione
 * (`/.//host`, `/a/..//host`, `/%2e%2e//host` diventano `//host`) e sul percorso decodificato
 * (`/%2F/host`), perché un BFF che decodifica `returnTo` non deve mai ricevere un `//host`.
 */
export function safeRedirect(target: unknown, fallback = '/'): string {
  if (typeof target !== 'string' || target.length === 0) return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  if (target.includes('\\') || CONTROL_CHARS.test(target)) return fallback;
  try {
    const url = new URL(target, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    const normalized = `${url.pathname}${url.search}${url.hash}`;
    if (isProtocolRelative(normalized) || isProtocolRelative(decodeURIComponent(url.pathname))) {
      return fallback;
    }
    return normalized;
  } catch {
    return fallback;
  }
}
