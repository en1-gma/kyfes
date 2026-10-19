import DOMPurify from 'dompurify';

/** Forbidden both as a tag (<style>) and as an attribute (style="…"). */
const STYLE = 'style';

const FORBID_TAGS = [
  STYLE,
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'iframe',
  'object',
  'embed',
];

/**
 * Sanitizes untrusted HTML (DOMPurify, HTML profile only). Browser-only: on the server
 * (no DOM) it returns an empty string, so render untrusted HTML in client components.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined' || !DOMPurify.isSupported) return '';
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS,
    FORBID_ATTR: [STYLE],
    ALLOW_DATA_ATTR: false,
  });
}
