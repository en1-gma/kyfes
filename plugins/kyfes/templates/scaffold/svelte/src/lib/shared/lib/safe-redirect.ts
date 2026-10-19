import { hasControlChars } from './control-chars';

/**
 * Accepts only relative paths of the same origin ("/orders?x=1"). Everything else
 * (protocol-relative "//", schemes, backslashes, control characters) falls back to `fallback`.
 */
export function safeRedirect(target: unknown, fallback = '/'): string {
	if (typeof target !== 'string' || target.length === 0) return fallback;
	if (!target.startsWith('/') || target.startsWith('//')) return fallback;
	if (target.includes('\\') || hasControlChars(target)) return fallback;
	try {
		const base = 'https://kyfes.invalid';
		const url = new URL(target, base);
		if (url.origin !== base) return fallback;
		return url.pathname + url.search + url.hash;
	} catch {
		return fallback;
	}
}
