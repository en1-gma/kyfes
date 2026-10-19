/**
 * Cross-cutting domain constants: the only place where they are written. Every other module imports them
 * (shared/<x> re-exports keep their public API). Feature constants live in features/<f>/constants.ts.
 */

// ---------------------------------------------------------------- RBAC

/** CASL actions: always referenced as `ACTION.update`, never written as string literals. */
export const ACTION = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
} as const
export type Actions = (typeof ACTION)[keyof typeof ACTION]
export const ACTIONS: readonly Actions[] = Object.values(ACTION)

/**
 * Subject registry: one singular PascalCase noun per feature (re-exported by features/<f>/constants.ts).
 * Adding a feature = adding its subject name here.
 */
export const SUBJECT = { Order: 'Order' } as const
export type SubjectName = (typeof SUBJECT)[keyof typeof SUBJECT]
export const SUBJECTS: readonly SubjectName[] = Object.values(SUBJECT)

// ---------------------------------------------------------------- API and BFF

/** Default API base path (same origin, behind the reverse proxy). */
export const DEFAULT_API_BASE_URL = '/api'

/** BFF authentication endpoints (relative to API_BASE_URL). */
export const AUTH_ENDPOINTS = {
  me: '/auth/me',
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
} as const

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN'
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN'
export const CORRELATION_HEADER = 'x-correlation-id'

// ---------------------------------------------------------------- environment

/** Boolean flags arrive from Vite as strings. */
export const ENV_FLAG = { on: 'true', off: 'false' } as const

// ---------------------------------------------------------------- i18n

/** Supported UI languages. The first one is the fallback. */
export const SUPPORTED_LOCALES = ['it', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const FALLBACK_LOCALE: Locale = SUPPORTED_LOCALES[0]

/** Namespace of the shared messages (`common.*` keys), bundled with the app. */
export const COMMON_NS = 'common'

/** Currency used when none is given. */
export const DEFAULT_CURRENCY = 'EUR'

/** Shared validation messages: i18n keys translated by the forms. */
export const VALIDATION_MESSAGE = {
  required: 'common.validation.required',
  tooLong: 'common.validation.tooLong',
  invalid: 'common.validation.invalid',
  positive: 'common.validation.positive',
} as const

// ---------------------------------------------------------------- routing

/** Route names not owned by a feature. */
export const ROUTE_NAME = { notFound: 'not-found', forbidden: 'forbidden' } as const
/** Name of the route that renders the 403 page while keeping the requested URL. */
export const FORBIDDEN_ROUTE = ROUTE_NAME.forbidden
/** 404 and 403 share the catch-all pattern. */
export const CATCH_ALL_PATH = ':pathMatch(.*)*'

// ---------------------------------------------------------------- charts

/** Series types the wrappers render (ECharts `series.type`). */
export const CHART_KIND = { bar: 'bar', line: 'line' } as const
export type ChartKind = (typeof CHART_KIND)[keyof typeof CHART_KIND]

/** How values are formatted in tooltip and axis. */
export const CHART_VALUE_FORMAT = { number: 'number', currency: 'currency' } as const
export type ChartValueFormat = (typeof CHART_VALUE_FORMAT)[keyof typeof CHART_VALUE_FORMAT]

/** Chart palette: design tokens (CSS variables on :root) and their fallbacks. */
export const CHART_PALETTE_VARS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']
export const CHART_PRIMARY_FALLBACK = '#2563eb'
export const CHART_FALLBACK_COLORS = [CHART_PRIMARY_FALLBACK, '#16a34a', '#d97706', '#9333ea', '#dc2626']

// ---------------------------------------------------------------- security

/** Tags and attributes the HTML sanitizer always removes. */
export const SANITIZE_FORBID_TAGS = ['style', 'form', 'input', 'button', 'textarea', 'select']
export const SANITIZE_FORBID_ATTR = ['style']

/** Protocols accepted for user-provided absolute URLs. */
export const SAFE_URL_PROTOCOLS = ['https:', 'mailto:', 'tel:']
