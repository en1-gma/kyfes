import DOMPurify from 'dompurify';

const FORBID_TAGS = [
  'style',
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
    FORBID_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
  });
}
