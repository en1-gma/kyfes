// Cross-cutting domain constants: the only place their values are written.
// No 'use client': server components, proxy and route handlers read them too.

/** CASL actions: `ACTION.update`, never `'update'`. */
export const ACTION = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
} as const;

/**
 * Registry of the CASL subjects of every feature (one singular PascalCase noun each).
 * A new feature adds its subject here and references it from `features/<f>/constants.ts`.
 */
export const SUBJECT = {
  Order: 'Order',
} as const;

/** Default API base URL: same-origin path proxied to the backend. */
export const DEFAULT_API_BASE_URL = '/api';

/** BFF auth endpoints (relative to API_BASE_URL). */
export const AUTH_ENDPOINTS = {
  me: '/auth/me',
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
} as const;

/** Double-submit XSRF cookie and header (set by the BFF). */
export const XSRF_COOKIE = 'XSRF-TOKEN';
export const XSRF_HEADER = 'X-XSRF-TOKEN';
/** Response header carrying the backend correlation id. */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** Header carrying the policy (request, so Next applies the nonce, and response). */
export const CSP_HEADER = 'Content-Security-Policy';
/** Request header exposing the per-request nonce to server components. */
export const NONCE_HEADER = 'x-nonce';
/** CSP source keywords: quoted as the header requires. */
export const CSP_SRC = {
  self: "'self'",
  none: "'none'",
  strictDynamic: "'strict-dynamic'",
  unsafeEval: "'unsafe-eval'",
  unsafeInline: "'unsafe-inline'",
} as const;

/** Supported locales; the first one is the default when NEXT_PUBLIC_DEFAULT_LOCALE is unset. */
export const LOCALES = ['it', 'en'] as const;
/** Cookie holding the locale chosen by the user. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const TIME_ZONE = 'Europe/Rome';
/** Global i18n namespace (loaded for every route): `useTranslations(COMMON_NS)`. */
export const COMMON_NS = 'common';
export const DEFAULT_CURRENCY = 'EUR';

/** Date presets shared by every screen: `formatDate(value, DATE_FORMAT.dateTime)`. */
export const DATE_FORMAT = {
  date: { dateStyle: 'medium' },
  dateTime: { dateStyle: 'long', timeStyle: 'short' },
  monthYear: { month: 'short', year: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

/** Boolean env flags are the strings `'true'` / `'false'`. */
export const ENV_FLAG = { on: 'true', off: 'false' } as const;

export const BUTTON_VARIANT = {
  default: 'default',
  primary: 'primary',
  danger: 'danger',
} as const;

export const CHART_KIND = {
  bar: 'bar',
  line: 'line',
} as const;
/** CSS design tokens of the chart palette (:root --chart-N). */
export const CHART_PALETTE_TOKENS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--chart-6',
] as const;

/** Forbidden by the sanitizer both as a tag (<style>) and as an attribute (style="…"). */
export const STYLE = 'style';
