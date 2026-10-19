const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Returns `target` only if it is a same-origin relative path ("/orders?x=1"),
 * otherwise `fallback`. Rejects "//host", schemes, backslashes and control characters.
 */
export function safeRedirect(target: unknown, fallback = '/'): string {
  if (typeof target !== 'string' || target.length === 0 || target.length > 2048) return fallback;
  if (CONTROL_CHARS.test(target)) return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  if (target.includes('\\')) return fallback;
  try {
    const base = 'https://kyfes.invalid';
    const url = new URL(target, base);
    if (url.origin !== base) return fallback;
    const result = `${url.pathname}${url.search}${url.hash}`;
    // Dot segments can collapse into "//host" (e.g. "/.//evil.example") and encoded slashes may be
    // decoded downstream ("/%2F/evil.example"): re-check the normalised path, decoded and not.
    const decoded = url.pathname.replace(/%2f/gi, '/').replace(/%5c/gi, '\\');
    for (const path of [result, decoded]) {
      if (path.startsWith('//') || path.includes('\\')) return fallback;
    }
    return result;
  } catch {
    return fallback;
  }
}
