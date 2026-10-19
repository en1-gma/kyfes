import DOMPurify from 'dompurify';

/**
 * The only way to render HTML coming from users or the backend (kyfes §3.3).
 * Profile: HTML only (no SVG/MathML), no inline styles, no forms; links get rel/target forced below.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
    // kept only to be normalised by the hook below (rel=noopener noreferrer)
    ADD_ATTR: ['target'],
  });
}

// Every link that survives sanitisation opens safely.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
