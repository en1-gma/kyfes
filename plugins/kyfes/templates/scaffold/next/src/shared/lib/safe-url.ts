const ALLOWED_PROTOCOLS = new Set(['https:', 'mailto:', 'tel:']);
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Returns a URL that is safe to put in href/src: https, mailto, tel or a relative path.
 * Anything else (javascript:, data:, http:, vbscript:, …) returns `undefined`.
 */
export function safeUrl(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const value = input.trim();
  if (value.length === 0 || CONTROL_CHARS.test(value) || value.includes('\\')) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#') || value.startsWith('?')) return value;
  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
