const ALLOWED_PROTOCOLS = new Set(['https:', 'mailto:', 'tel:']);
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * User-provided URL usable in `href`/`src`: `https:`, `mailto:`, `tel:` or a relative path.
 * Anything else (`javascript:`, `data:`, `http:`, `//host`) returns `undefined` (kyfes §3.3).
 */
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  if (raw === '' || CONTROL_CHARS.test(raw) || raw.includes('\\')) return undefined;
  if (raw.startsWith('//')) return undefined;
  if (
    raw.startsWith('/') ||
    raw.startsWith('./') ||
    raw.startsWith('../') ||
    raw.startsWith('#') ||
    raw.startsWith('?')
  ) {
    return raw;
  }
  try {
    const url = new URL(raw);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : undefined;
  } catch {
    // No scheme and not an absolute path (e.g. "orders/1"): treat as relative only if it has no ':'.
    return raw.includes(':') ? undefined : raw;
  }
}
