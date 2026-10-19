import DOMPurify from 'dompurify';

/**
 * Unico punto con DOMPurify. Da usare SEMPRE sulla stessa riga del binding HTML,
 * es. `[innerHTML]="sanitizeHtml(note)"`: il sanitizer di Angular resta attivo come seconda difesa.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button'],
    FORBID_ATTR: ['style'],
  });
}
