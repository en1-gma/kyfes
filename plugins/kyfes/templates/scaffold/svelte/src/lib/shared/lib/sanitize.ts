import DOMPurify from 'dompurify';

/**
 * The only way to render user-provided HTML: `{@html sanitizeHtml(value)}` on the same line.
 * Scripts, event handlers, javascript: URLs, forms and inline styles are removed.
 */
/** Both the <style> element and the style attribute. */
const INLINE_STYLE = 'style';

export function sanitizeHtml(dirty: string): string {
	return DOMPurify.sanitize(dirty, {
		USE_PROFILES: { html: true },
		FORBID_TAGS: [INLINE_STYLE, 'form', 'input', 'button', 'textarea', 'select'],
		FORBID_ATTR: [INLINE_STYLE]
	});
}
