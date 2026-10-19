// Control characters (C0, DEL, C1) are never valid in a redirect target.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * Returns `target` only if it is a relative path of the same origin (`/orders?x=1#y`),
 * otherwise `fallback`. Rejects `//host`, `/\host`, schemes (`javascript:`, `https:`),
 * backslashes and control characters (kyfes §3.1: open redirect).
 */
export function safeRedirect(target: unknown, fallback = '/'): string {
  if (typeof target !== 'string') return fallback;
  const value = target.trim();
  if (value === '' || value !== target) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('\\') || CONTROL_CHARS.test(value)) return fallback;
  try {
    const base = 'https://kyfes.invalid';
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
