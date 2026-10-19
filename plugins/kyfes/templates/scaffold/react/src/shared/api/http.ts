import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/shared/config';
import { ApiError, ApiErrorBodySchema } from './api-error';

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CORRELATION_HEADER = 'x-correlation-id';

/** Auth endpoints never trigger the refresh/retry logic (avoids loops). */
const AUTH_ENDPOINTS = ['/auth/refresh', '/auth/login', '/auth/logout'];

/**
 * XSRF header only towards the API origin (kyfes §3.2): the token is never leaked to third parties,
 * even if someone passes an absolute URL to the client.
 */
export function shouldSendXsrf(config: Pick<InternalAxiosRequestConfig, 'baseURL' | 'url'>): boolean {
  const origin = window.location.origin;
  try {
    const base = new URL(config.baseURL ?? '/', origin);
    const target = new URL(config.url ?? '', base.href.endsWith('/') ? base.href : `${base.href}/`);
    return target.origin === origin && base.origin === origin;
  } catch {
    return false;
  }
}

export const http = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: XSRF_COOKIE_NAME,
  xsrfHeaderName: XSRF_HEADER_NAME,
  withXSRFToken: shouldSendXsrf,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

// ---------------------------------------------------------------- callbacks registered by the app

interface HttpHooks {
  /** 401 not recoverable with a refresh: the app redirects to login. */
  onUnauthorized?: (() => void) | undefined;
  /** 403: permissions may have changed, the app invalidates the session query. */
  onForbidden?: (() => void) | undefined;
  /** Enable single-flight `POST /auth/refresh` + one retry on 401. */
  refreshOnUnauthorized?: boolean | undefined;
}

let hooks: HttpHooks = {};

/** Registers the callbacks; returns a function that restores the previous ones. */
export function configureHttp(next: HttpHooks): () => void {
  const previous = hooks;
  hooks = { ...hooks, ...next };
  return () => {
    hooks = previous;
  };
}

// ---------------------------------------------------------------- error normalisation

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) {
    return new ApiError({ status: 0, code: 'UNKNOWN', message: 'Unexpected error', cause: error });
  }
  const response = error.response;
  if (!response) {
    const timeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return new ApiError({
      status: 0,
      code: timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      message: error.message,
      cause: error,
    });
  }
  const body = ApiErrorBodySchema.safeParse(response.data);
  const headerId = AxiosHeaders.from(response.headers as Record<string, string>).get(CORRELATION_HEADER);
  const correlationId =
    (body.success ? body.data.correlationId : undefined) ??
    (typeof headerId === 'string' ? headerId : undefined);
  return new ApiError({
    status: response.status,
    code: body.success ? body.data.code : `HTTP_${response.status}`,
    message: body.success ? body.data.message : error.message,
    correlationId,
    fieldErrors: body.success ? body.data.fieldErrors : undefined,
    cause: error,
  });
}

// ---------------------------------------------------------------- 401: single-flight refresh

type RetriableConfig = InternalAxiosRequestConfig & { _kyfesRetried?: boolean };

let refreshInFlight: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  refreshInFlight ??= http
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function isAuthEndpoint(url: string | undefined): boolean {
  return !!url && AUTH_ENDPOINTS.some((p) => url.endsWith(p));
}

http.interceptors.response.use(undefined, async (error: unknown) => {
  const apiError = toApiError(error);
  const config = axios.isAxiosError(error) ? (error as AxiosError).config : undefined;
  const original = config as RetriableConfig | undefined;

  if (apiError.isUnauthorized && original && !isAuthEndpoint(original.url)) {
    if (hooks.refreshOnUnauthorized && !original._kyfesRetried) {
      original._kyfesRetried = true;
      try {
        await refreshSession();
      } catch {
        hooks.onUnauthorized?.();
        throw apiError;
      }
      return http.request(original);
    }
    hooks.onUnauthorized?.();
  }
  if (apiError.isForbidden) hooks.onForbidden?.();
  throw apiError;
});
