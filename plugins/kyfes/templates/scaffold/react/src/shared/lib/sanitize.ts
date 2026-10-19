import DOMPurify from 'dompurify';
import { STYLE, TARGET_ATTR } from '@/shared/config/constants';

/**
 * The only way to render HTML coming from users or the backend (kyfes §3.3).
 * Profile: HTML only (no SVG/MathML), no inline styles, no forms; links get rel/target forced below.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [STYLE, 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: [STYLE],
    ALLOW_DATA_ATTR: false,
    // kept only to be normalised by the hook below (rel=noopener noreferrer)
    ADD_ATTR: [TARGET_ATTR],
  });
}

// Every link that survives sanitisation opens safely.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute(TARGET_ATTR) === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
