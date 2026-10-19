import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/shared/config/env';
import { toApiError } from './api-error';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const AUTH_PATHS = ['/auth/me', '/auth/login', '/auth/logout', '/auth/refresh'];

let onUnauthorized: (() => void) | null = null;
let refreshPath: string | null = '/auth/refresh';
let refreshInFlight: Promise<boolean> | null = null;

/** Registers what happens on a 401 that could not be recovered (e.g. invalidate session + login). */
export function setOnUnauthorized(callback: (() => void) | null): void {
  onUnauthorized = callback;
}

/** Path of the BFF refresh endpoint (relative to API_BASE_URL); `null` disables the refresh attempt. */
export function setRefreshPath(path: string | null): void {
  refreshPath = path;
}

function currentOrigin(): string | null {
  return typeof window === 'undefined' ? null : window.location.origin;
}

/** Origin the API is served from (same origin when API_BASE_URL is a path). */
export function apiOrigin(): string | null {
  const origin = currentOrigin();
  if (!origin) return null;
  return new URL(env.API_BASE_URL, origin).origin;
}

/** XSRF header only towards the API origin, never to third parties. */
export function shouldSendXsrf(
  config: Pick<InternalAxiosRequestConfig, 'baseURL' | 'url'>,
): boolean {
  const origin = currentOrigin();
  const api = apiOrigin();
  if (!origin || !api) return false;
  const base = new URL(config.baseURL ?? env.API_BASE_URL, origin);
  const target = new URL(config.url ?? '', base.href.endsWith('/') ? base.href : `${base.href}/`);
  return target.origin === api;
}

export const http = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: (config) => shouldSendXsrf(config),
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

function isAuthCall(config: InternalAxiosRequestConfig | undefined): boolean {
  const url = config?.url ?? '';
  return AUTH_PATHS.some((p) => url === p || url.startsWith(`${p}?`));
}

/** Single-flight refresh: concurrent 401s wait for the same request. */
function refreshSession(): Promise<boolean> {
  if (!refreshPath) return Promise.resolve(false);
  refreshInFlight ??= http
    .post(refreshPath)
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) throw error;
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status ?? 0;

    if (status === 401 && config && !isAuthCall(config)) {
      if (!config._retried && (await refreshSession())) {
        config._retried = true;
        return http.request(config);
      }
      onUnauthorized?.();
    }

    const correlationId: unknown = error.response?.headers?.['x-correlation-id'];
    throw toApiError(
      status,
      error.response?.data,
      typeof correlationId === 'string' ? correlationId : undefined,
    );
  },
);
