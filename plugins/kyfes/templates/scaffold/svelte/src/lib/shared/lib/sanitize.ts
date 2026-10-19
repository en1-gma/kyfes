import DOMPurify from 'dompurify';
import { INLINE_STYLE } from '$lib/shared/config/constants';

/**
 * The only way to render user-provided HTML: `{@html sanitizeHtml(value)}` on the same line.
 * Scripts, event handlers, javascript: URLs, forms and inline styles (both the <style> element
 * and the style attribute) are removed.
 */
export function sanitizeHtml(dirty: string): string {
	return DOMPurify.sanitize(dirty, {
		USE_PROFILES: { html: true },
		FORBID_TAGS: [INLINE_STYLE, 'form', 'input', 'button', 'textarea', 'select'],
		FORBID_ATTR: [INLINE_STYLE]
	});
}
