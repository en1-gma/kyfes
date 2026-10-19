import {
  HttpClient,
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  type HttpInterceptorFn,
  type HttpRequest,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import {
  type EnvironmentProviders,
  Injectable,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { type Observable, catchError, defer, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { env } from '@shared/config/env';
import { ApiError } from './api-error';
import { ApiEvents } from './api-events';

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
export const DEFAULT_TIMEOUT_MS = 15_000;

export interface ApiOptions {
  /** Base delle chiamate (default da env: "/api", stessa origine). */
  baseUrl: string;
  timeoutMs: number;
  /**
   * POST /auth/refresh single-flight e una sola ripetizione su 401 (default: attivo, come in Next).
   * L'endpoint è opzionale: se risponde 404/401 si va al login.
   */
  refreshSession: boolean;
}

export const API_OPTIONS = new InjectionToken<ApiOptions>('API_OPTIONS', {
  providedIn: 'root',
  factory: () => ({ baseUrl: env.API_BASE_URL, timeoutMs: DEFAULT_TIMEOUT_MS, refreshSession: true }),
});

/** Richieste che non devono innescare refresh/redirect (es. la chiamata di refresh stessa). */
export const SKIP_AUTH_HANDLING = new HttpContextToken<boolean>(() => false);
const ALREADY_RETRIED = new HttpContextToken<boolean>(() => false);

/** Default di ogni richiesta: cookie di sessione, Accept JSON, timeout. */
export const apiDefaultsInterceptor: HttpInterceptorFn = (req, next) => {
  const { timeoutMs } = inject(API_OPTIONS);
  return next(
    req.clone({
      withCredentials: true,
      setHeaders: req.headers.has('Accept') ? {} : { Accept: 'application/json' },
      timeout: req.timeout ?? timeoutMs,
    }),
  );
};

/** Normalizza ogni errore HTTP in ApiError (più interno: gli altri interceptor vedono già ApiError). */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) =>
      throwError(() => (error instanceof HttpErrorResponse ? ApiError.fromHttpError(error) : error)),
    ),
  );

/**
 * Refresh della sessione single-flight: una sola POST /auth/refresh in volo, le altre attendono.
 * `epoch` conta i refresh riusciti ed è l'"istante" logico dell'ultimo: una richiesta partita
 * prima dell'ultimo refresh riuscito che riceve 401 viene ripetuta senza un nuovo refresh.
 * Se il refresh fallisce (401, 404 se il BFF non lo espone, rete) `onUnauthorized` parte una volta sola.
 */
@Injectable({ providedIn: 'root' })
export class SessionRefresher {
  private readonly http = inject(HttpClient);
  private readonly options = inject(API_OPTIONS);
  private readonly events = inject(ApiEvents);
  private inFlight: Observable<void> | null = null;
  private refreshed = 0;

  /** Numero di refresh riusciti finora (da leggere alla partenza di ogni richiesta). */
  get epoch(): number {
    return this.refreshed;
  }

  refresh(): Observable<void> {
    this.inFlight ??= this.http
      .post(`${this.options.baseUrl}/auth/refresh`, null, {
        context: new HttpContext().set(SKIP_AUTH_HANDLING, true),
        responseType: 'text',
      })
      .pipe(
        map(() => {
          this.refreshed += 1;
        }),
        catchError((error: unknown) => {
          this.events.emitUnauthorized();
          return throwError(() => error);
        }),
        finalize(() => (this.inFlight = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.inFlight;
  }
}

function retryOnce(req: HttpRequest<unknown>): HttpRequest<unknown> {
  return req.clone({ context: req.context.set(ALREADY_RETRIED, true) });
}

const AUTH_ENDPOINT = /\/auth\/(?:refresh|login|logout)(?:[?#]|$)/;

/** Le chiamate di login/logout/refresh non innescano mai refresh né callback. */
function skipsAuthHandling(req: HttpRequest<unknown>): boolean {
  return req.context.get(SKIP_AUTH_HANDLING) || AUTH_ENDPOINT.test(req.url);
}

/**
 * 401 → refresh opzionale + ripetizione una sola volta, altrimenti callback `onUnauthorized`.
 * 403 → `onForbidden`, anche sulla richiesta ripetuta dopo il refresh.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (skipsAuthHandling(req)) return next(req);
  const events = inject(ApiEvents);
  const options = inject(API_OPTIONS);
  const refresher = inject(SessionRefresher);

  const retry = () =>
    next(retryOnce(req)).pipe(
      catchError((retryError: unknown) => {
        if (retryError instanceof ApiError && retryError.status === 401) events.emitUnauthorized();
        if (retryError instanceof ApiError && retryError.status === 403) events.emitForbidden();
        return throwError(() => retryError);
      }),
    );

  return defer(() => {
    const startedAt = refresher.epoch;
    return next(req).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof ApiError)) return throwError(() => error);
        if (error.status === 403) events.emitForbidden();
        if (error.status !== 401) return throwError(() => error);
        if (!options.refreshSession || req.context.get(ALREADY_RETRIED)) {
          events.emitUnauthorized();
          return throwError(() => error);
        }
        // Partita prima dell'ultimo refresh riuscito: aveva il cookie vecchio, basta ripeterla.
        if (startedAt < refresher.epoch) return retry();
        return refresher.refresh().pipe(
          // Il refresher ha già emesso onUnauthorized: si propaga il 401 originale.
          catchError(() => throwError(() => error)),
          switchMap(() => retry()),
        );
      }),
    );
  });
};

/**
 * HttpClient dell'applicazione. Il backend di default è `fetch`.
 * XSRF (double-submit): Angular aggiunge `X-XSRF-TOKEN` letto dal cookie `XSRF-TOKEN`
 * solo per i metodi non sicuri e solo verso la stessa origine.
 */
export function provideApi(options: Partial<ApiOptions> = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(
      withXsrfConfiguration({ cookieName: XSRF_COOKIE_NAME, headerName: XSRF_HEADER_NAME }),
      withInterceptors([apiDefaultsInterceptor, authErrorInterceptor, apiErrorInterceptor]),
    ),
    {
      provide: API_OPTIONS,
      useValue: {
        baseUrl: env.API_BASE_URL,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        refreshSession: true,
        ...options,
      } satisfies ApiOptions,
    },
  ]);
}
