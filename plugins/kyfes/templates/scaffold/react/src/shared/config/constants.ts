/**
 * Cross-cutting domain constants, written once (kyfes `constants-location`): every other module of
 * shared/ and every feature imports them from here. Leaf module: it imports nothing.
 */

// ---------------------------------------------------------------- RBAC

/** CASL actions: guards, `can()`, `<Can>` and mock rules reference these. */
export const ACTIONS = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
} as const;
export type Actions = (typeof ACTIONS)[keyof typeof ACTIONS];

/** Names of the CASL subjects; each feature takes its own (`ORDER_SUBJECT = SUBJECT.Order`). */
export const SUBJECT = {
  Order: 'Order',
} as const;

// ---------------------------------------------------------------- HTTP / BFF session

/** Endpoints of the BFF session (relative to the API base URL). */
export const AUTH_ENDPOINTS = {
  me: '/auth/me',
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
} as const;

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
/** Response header carrying the correlation id when the error body has none. */
export const CORRELATION_HEADER = 'x-correlation-id';

// ---------------------------------------------------------------- env

/** Value of an enabled boolean flag (`VITE_*=true`); `false` or empty disable it. */
export const FLAG_ON = 'true';
export const FLAG_OFF = 'false';

// ---------------------------------------------------------------- i18n

/** Language used when `VITE_DEFAULT_LOCALE` is not set. */
export const FALLBACK_LOCALE = 'it';

/** Locales the UI ships with. Add a language here and a `locales/<lng>.json` in every namespace. */
export const SUPPORTED_LOCALES = [FALLBACK_LOCALE, 'en'] as const;

/** Namespace of the shared texts (`shared/i18n/locales`): default and fallback of every `t()`. */
export const COMMON_NS = 'common';

/**
 * Keys of the `common` namespace (`validation.*`) used as Zod error messages: forms translate them,
 * so every schema names a message through these constants.
 */
export const VALIDATION_KEYS = {
  required: 'validation.required',
  maxLength: 'validation.maxLength',
  invalid: 'validation.invalid',
  nonNegative: 'validation.nonNegative',
} as const;

/** ISO 4217 currency of the amounts when the caller does not pass one. */
export const DEFAULT_CURRENCY = 'EUR';

// ---------------------------------------------------------------- UI

/** Visual variants of `<Button>` (CSS modifier `btn--<variant>`). */
export const BUTTON_VARIANT = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  ghost: 'ghost',
} as const;
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

/** Attribute set on the `<dialog>` when `showModal()`/`close()` are missing (old engines, jsdom). */
export const OPEN_ATTR = 'open';

// ---------------------------------------------------------------- charts

/** Fields of a chart datum, as Recharts `dataKey`s (`ChartDatum` is keyed on these). */
export const CHART_DATUM_KEY = {
  label: 'label',
  value: 'value',
} as const;

/** Kinds of series drawn by the cartesian chart. */
export const CHART_VARIANT = {
  bar: 'bar',
  line: 'line',
} as const;

/** Palette from CSS custom properties (app/styles.css): theme changes need no JS. */
export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'] as const;

// ---------------------------------------------------------------- HTML sanitizer

/** Both the `<style>` tag and the `style` attribute: no inline CSS in user HTML. */
export const STYLE = 'style';
export const TARGET_ATTR = 'target';
