import { SAFE_URL_PROTOCOLS } from '$lib/shared/config/constants';
import { hasControlChars } from './control-chars';

const ALLOWED_PROTOCOLS = new Set<string>(SAFE_URL_PROTOCOLS);

/**
 * URLs coming from users/data: only https:, mailto:, tel: and relative paths.
 * Returns undefined for anything else (javascript:, data:, http:, …): render no link.
 */
export function safeUrl(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const url = value.trim();
	if (url.length === 0 || hasControlChars(url) || url.includes('\\')) return undefined;
	if (url.startsWith('/') && !url.startsWith('//')) return url;
	if (url.startsWith('#') || url.startsWith('?')) return url;
	try {
		const parsed = new URL(url);
		return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed.href : undefined;
	} catch {
		return undefined;
	}
}
