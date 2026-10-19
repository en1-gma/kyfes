import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/shared/config/env';
import { toApiError } from './api-error';

type RetriableConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  /** Refresh generation when the request started (see `refreshGeneration`). */
  _refreshGeneration?: number;
};

/** Never refreshed nor reported as unauthorized: they are the auth flow itself (avoids loops). */
const AUTH_FLOW_PATHS = ['/auth/login', '/auth/logout', '/auth/refresh'];
/** The session probe: refreshed on 401, but its failure is not reported (RequireAuth handles it). */
const SESSION_PATH = '/auth/me';

let onUnauthorized: (() => void) | null = null;
let refreshPath: string | null = '/auth/refresh';
let refreshInFlight: Promise<boolean> | null = null;
/** Logical clock of completed refresh attempts and the outcome of the last one. */
let refreshGeneration = 0;
let lastRefreshOk = false;

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

/**
 * XSRF header only towards the API on the page origin: the cookie is readable only there and
 * the token is never sent cross-origin, even if someone passes an absolute URL to the client.
 */
export function shouldSendXsrf(
  config: Pick<InternalAxiosRequestConfig, 'baseURL' | 'url'>,
): boolean {
  const origin = currentOrigin();
  const api = apiOrigin();
  if (!origin || !api) return false;
  try {
    const base = new URL(config.baseURL ?? env.API_BASE_URL, origin);
    const target = new URL(config.url ?? '', base.href.endsWith('/') ? base.href : `${base.href}/`);
    return target.origin === origin && target.origin === api;
  } catch {
    return false;
  }
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

function matchesPath(config: InternalAxiosRequestConfig | undefined, paths: string[]): boolean {
  const url = config?.url ?? '';
  return paths.some((p) => url === p || url.startsWith(`${p}?`));
}

function isAuthFlowCall(config: InternalAxiosRequestConfig | undefined): boolean {
  return matchesPath(config, refreshPath ? [...AUTH_FLOW_PATHS, refreshPath] : AUTH_FLOW_PATHS);
}

/**
 * Single-flight refresh: concurrent 401s wait for the same request. A failed refresh reports
 * `onUnauthorized` once, unless the only waiter is the session probe (it resolves to anonymous).
 */
function refreshSession(config: RetriableConfig): Promise<boolean> {
  if (!refreshPath) {
    if (!matchesPath(config, [SESSION_PATH])) onUnauthorized?.();
    return Promise.resolve(false);
  }
  refreshInFlight ??= http
    .post(refreshPath)
    .then(() => true)
    .catch(() => false)
    .then((ok) => {
      refreshGeneration += 1;
      lastRefreshOk = ok;
      return ok;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  const pending = refreshInFlight;
  return pending.then((ok) => {
    if (!ok && !matchesPath(config, [SESSION_PATH])) notifyUnauthorizedOnce(pending);
    return ok;
  });
}

let notifiedFor: Promise<boolean> | null = null;

function notifyUnauthorizedOnce(attempt: Promise<boolean>): void {
  if (notifiedFor === attempt) return;
  notifiedFor = attempt;
  onUnauthorized?.();
}

/** 401 handling: `true` when the original request should be sent again. */
async function recoverFromUnauthorized(config: RetriableConfig): Promise<boolean> {
  if (config._retried) {
    if (!matchesPath(config, [SESSION_PATH])) onUnauthorized?.();
    return false;
  }
  config._retried = true;
  // A refresh finished after this request started: reuse its outcome, never refresh twice.
  if ((config._refreshGeneration ?? 0) < refreshGeneration) return lastRefreshOk;
  return refreshSession(config);
}

http.interceptors.request.use((config: RetriableConfig) => {
  config._refreshGeneration ??= refreshGeneration;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    // Aborted requests (unmount, query cancellation) are not network errors.
    if (axios.isCancel(error)) throw error;
    if (!(error instanceof AxiosError)) throw error;
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status ?? 0;

    if (status === 401 && config && !isAuthFlowCall(config)) {
      if (await recoverFromUnauthorized(config)) {
        config._refreshGeneration = refreshGeneration;
        return http.request(config);
      }
    }

    const correlationId: unknown = error.response?.headers?.['x-correlation-id'];
    throw toApiError(
      status,
      error.response?.data,
      typeof correlationId === 'string' ? correlationId : undefined,
    );
  },
);
