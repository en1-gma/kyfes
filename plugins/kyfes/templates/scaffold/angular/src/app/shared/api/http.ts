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
import { type Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
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
  /** Se il BFF espone POST /auth/refresh: refresh single-flight e una sola ripetizione. */
  refreshSession: boolean;
}

export const API_OPTIONS = new InjectionToken<ApiOptions>('API_OPTIONS', {
  providedIn: 'root',
  factory: () => ({ baseUrl: env.API_BASE_URL, timeoutMs: DEFAULT_TIMEOUT_MS, refreshSession: false }),
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

/** Refresh della sessione single-flight: una sola POST /auth/refresh in volo, le altre attendono. */
@Injectable({ providedIn: 'root' })
export class SessionRefresher {
  private readonly http = inject(HttpClient);
  private readonly options = inject(API_OPTIONS);
  private inFlight: Observable<void> | null = null;

  refresh(): Observable<void> {
    this.inFlight ??= this.http
      .post(`${this.options.baseUrl}/auth/refresh`, null, {
        context: new HttpContext().set(SKIP_AUTH_HANDLING, true),
      })
      .pipe(
        map(() => undefined),
        finalize(() => (this.inFlight = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.inFlight;
  }
}

function retryOnce(req: HttpRequest<unknown>): HttpRequest<unknown> {
  return req.clone({ context: req.context.set(ALREADY_RETRIED, true) });
}

/** 401 → refresh opzionale + ripetizione una sola volta, altrimenti callback `onUnauthorized`. 403 → `onForbidden`. */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH_HANDLING)) return next(req);
  const events = inject(ApiEvents);
  const options = inject(API_OPTIONS);
  const refresher = inject(SessionRefresher);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof ApiError)) return throwError(() => error);
      if (error.status === 403) events.emitForbidden();
      if (error.status !== 401) return throwError(() => error);
      if (options.refreshSession && !req.context.get(ALREADY_RETRIED)) {
        return refresher.refresh().pipe(
          catchError(() => {
            events.emitUnauthorized();
            return throwError(() => error);
          }),
          switchMap(() => next(retryOnce(req))),
          catchError((retryError: unknown) => {
            if (retryError instanceof ApiError && retryError.status === 401) events.emitUnauthorized();
            return throwError(() => retryError);
          }),
        );
      }
      events.emitUnauthorized();
      return throwError(() => error);
    }),
  );
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
        refreshSession: false,
        ...options,
      } satisfies ApiOptions,
    },
  ]);
}
