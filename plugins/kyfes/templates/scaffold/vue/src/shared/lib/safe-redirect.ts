// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/

/**
 * Accepts only same-origin relative paths ("/orders?x=1").
 * Rejects protocol-relative ("//evil"), schemes ("javascript:", "https:"), backslashes and control chars.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || typeof target !== 'string') return fallback
  if (CONTROL_CHARS.test(target)) return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return fallback
  try {
    const base = 'https://same-origin.invalid'
    const url = new URL(target, base)
    if (url.origin !== base) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
