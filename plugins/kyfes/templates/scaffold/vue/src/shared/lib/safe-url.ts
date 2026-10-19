const ALLOWED_PROTOCOLS = new Set(['https:', 'mailto:', 'tel:'])
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/

/** User-provided URLs for href/src: https, mailto, tel or relative. Anything else → undefined. */
export function safeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (trimmed === '' || CONTROL_CHARS.test(trimmed) || trimmed.includes('\\')) return undefined
  if (trimmed.startsWith('//')) return undefined
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('#')
  ) {
    return trimmed
  }
  try {
    const url = new URL(trimmed)
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
