import DOMPurify from 'dompurify';

/**
 * The only way to render user-provided HTML: `{@html sanitizeHtml(value)}` on the same line.
 * Scripts, event handlers, javascript: URLs, forms and inline styles are removed.
 */
export function sanitizeHtml(dirty: string): string {
	return DOMPurify.sanitize(dirty, {
		USE_PROFILES: { html: true },
		FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
		FORBID_ATTR: ['style']
	});
}
