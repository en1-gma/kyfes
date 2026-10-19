/**
 * Costanti trasversali dell'applicazione: unico punto in cui sono scritte. I moduli di `shared/*`
 * le importano (e le riespongono dalla loro API pubblica); le feature definiscono le proprie in
 * `features/<f>/constants.ts`. Nessun import da altri moduli: è una foglia.
 */

/** Azioni CASL (`ACTION.Update`, mai `'update'`): riesposte come `Action` da `@shared/rbac`. */
export const ACTION = {
  Create: 'create',
  Read: 'read',
  Update: 'update',
  Delete: 'delete',
  Manage: 'manage',
} as const;

/**
 * Registro dei soggetti CASL: un sostantivo singolare PascalCase per feature.
 * Ogni feature lo riespone in `features/<f>/constants.ts` (es. `ORDER_SUBJECT = SUBJECT.Order`).
 * Riesposto come `Subject` da `@shared/rbac`; 'all' è il jolly di CASL.
 */
export const SUBJECT = {
  Order: 'Order',
} as const;

/** Pagina 403 (mostrata mantenendo l'URL richiesto). */
export const FORBIDDEN_PATH = '/forbidden';

/** Endpoint di sessione del BFF (relativi a `API_BASE_URL`). */
export const AUTH_ENDPOINTS = {
  me: '/auth/me',
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
} as const;

/** XSRF double-submit: cookie scritto dal backend, header inviato da HttpClient. */
export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

/** Header con l'id di correlazione delle richieste (log del backend). */
export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

/** Opzioni per le risposte senza corpo JSON significativo (204, logout, refresh). */
export const TEXT_RESPONSE = { responseType: 'text' } as const;

/** Evento di `AbortSignal` (cancellazione di una richiesta). */
export const ABORT_EVENT = 'abort';

/** Codici di errore generati dal client (gli altri arrivano dal backend o sono `HTTP_<status>`). */
export const API_ERROR_CODE = {
  network: 'NETWORK_ERROR',
  invalidResponse: 'INVALID_RESPONSE',
} as const;

/** Lingue supportate e lingua di fallback (se `DEFAULT_LOCALE` non è configurata). */
export const LOCALE = { it: 'it', en: 'en' } as const;
export const SUPPORTED_LOCALES = [LOCALE.it, LOCALE.en] as const;
export const FALLBACK_LOCALE = LOCALE.it;

/** Valori ammessi per i flag booleani passati come stringa (`define` di angular.json). */
export const FLAG = { on: 'true', off: 'false' } as const;

/** Valuta di default degli importi (ISO 4217). */
export const DEFAULT_CURRENCY = 'EUR';

/** Chiave i18n dell'errore di campo generico (messaggio non traducibile o non riconosciuto). */
export const GENERIC_FIELD_ERROR = 'common.validation.invalid';

/** Origine fittizia per normalizzare i percorsi relativi in `safeRedirect`. */
export const REDIRECT_PLACEHOLDER_ORIGIN = 'https://redirect.invalid';

/** Varianti di `appButton`. */
export const BUTTON_VARIANT = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  ghost: 'ghost',
} as const;

/** Attributo HTML del `<dialog>` aperto (fallback senza `showModal`/`close`). */
export const DIALOG_OPEN_ATTRIBUTE = 'open';

/** Tipi di grafico cartesiano. */
export const CHART_KIND = { bar: 'bar', line: 'line' } as const;

/** Formato dei valori dei grafici (assi, tooltip, tabella alternativa). */
export const CHART_VALUE_FORMAT = { number: 'number', currency: 'currency' } as const;

/** Palette di riserva dei grafici se i token CSS `--chart-1…--chart-6` mancano. */
export const CHART_FALLBACK_PALETTE = [
  '#1f5fbf',
  '#c2410c',
  '#15803d',
  '#7e22ce',
  '#be123c',
  '#0f766e',
] as const;
