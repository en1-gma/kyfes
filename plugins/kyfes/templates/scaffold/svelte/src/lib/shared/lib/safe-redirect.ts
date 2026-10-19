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
		// Dot segments and encoded slashes ("/..//x", "/%2e%2e//x", "/%2F/x") can normalize
		// into a protocol-relative "//host": reject the result too, not only the input.
		const path = url.pathname;
		const decoded = decodeURIComponent(path);
		if ([path, decoded].some((value) => value.startsWith('//') || value.includes('\\'))) {
			return fallback;
		}
		return path + url.search + url.hash;
	} catch {
		return fallback;
	}
}
