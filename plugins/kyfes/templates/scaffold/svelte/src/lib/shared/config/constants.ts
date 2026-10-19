/**
 * Cross-cutting constants of the app: the only place they are defined. Modules import them from
 * here (shared/<x>/index.ts re-exports the public ones). A leaf module: it imports nothing.
 */

/** CASL actions of the app: guards, `can()`, `<Can>` and mocks reference these, never a string. */
export const Action = {
	Create: 'create',
	Read: 'read',
	Update: 'update',
	Delete: 'delete',
	Manage: 'manage'
} as const;

/**
 * Registry of the CASL subjects. Each feature exposes its subject in features/<f>/constants.ts
 * (taken from here) and the name is registered only here (shared never imports features).
 */
export const Subject = {
	Order: 'Order'
} as const;

/** BFF auth endpoints (relative to PUBLIC_API_BASE_URL): shared/auth and the HTTP client use these. */
export const AUTH_ENDPOINTS = {
	me: '/auth/me',
	login: '/auth/login',
	logout: '/auth/logout',
	refresh: '/auth/refresh'
} as const;

/** Base path of the BFF API when PUBLIC_API_BASE_URL is not set (same origin). */
export const DEFAULT_API_BASE_URL = '/api';

/** Double-submit XSRF cookie set by the BFF and header the HTTP client sends back. */
export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
/** Response header with the correlation id of a failed request (shown in ErrorState). */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** Supported locales (same list as project.inlang/settings.json) and the fallback one. */
export const LOCALE = { it: 'it', en: 'en' } as const;
export const SUPPORTED_LOCALES = [LOCALE.it, LOCALE.en] as const;
export const DEFAULT_LOCALE = LOCALE.it;

/** Currency of the amounts formatted by shared/i18n. */
export const DEFAULT_CURRENCY = 'EUR';

/** Values of a boolean environment flag (e.g. PUBLIC_API_MOCKS). */
export const ENV_FLAG = { on: 'true', off: 'false' } as const;

/** Visual variants of the shared Button (classes `.btn-<variant>`). */
export const BUTTON_VARIANT = {
	primary: 'primary',
	secondary: 'secondary',
	danger: 'danger'
} as const;

/** Series types the shared charts draw. */
export const CHART_KIND = { bar: 'bar', line: 'line' } as const;
/** Palette of the series: CSS design tokens of shared/ui/theme.css. */
export const CHART_PALETTE_VARS = [
	'--chart-1',
	'--chart-2',
	'--chart-3',
	'--chart-4',
	'--chart-5',
	'--chart-6'
] as const;
/** Text and axis colours of the charts (CSS design tokens) with their fallbacks. */
export const CHART_COLOR_VARS = { text: '--color-text', border: '--color-border' } as const;
export const CHART_FALLBACK_COLORS = {
	series: '#1d4ed8',
	text: '#1b1f24',
	border: '#d0d7de'
} as const;

/** Removed by the HTML sanitizer: both the <style> element and the style attribute. */
export const INLINE_STYLE = 'style';

/** Protocols a user-provided URL may use (relative paths are always allowed). */
export const SAFE_URL_PROTOCOLS = ['https:', 'mailto:', 'tel:'] as const;
