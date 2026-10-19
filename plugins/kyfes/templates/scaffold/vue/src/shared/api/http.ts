import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { env } from '@/shared/config/env'
import { toApiError } from './api-error'

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN'
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN'
export const CORRELATION_HEADER = 'x-correlation-id'
const REFRESH_URL = '/auth/refresh'
const AUTH_URLS = ['/auth/refresh', '/auth/login', '/auth/logout']

type RetriableConfig = InternalAxiosRequestConfig & {
  _retried?: boolean
  /** Session generation when the request was sent (see `sessionGeneration`). */
  _generation?: number
}

type HttpOptions = {
  /** Called when the session is gone (401 and, if enabled, the refresh failed: once per failed refresh). */
  onUnauthorized?: () => void
  /** Enable single-flight `POST /auth/refresh` before giving up on a 401. */
  refresh?: boolean
}

const options: HttpOptions = {}

/** Registers the 401 callback (app/) and enables the optional refresh flow. */
export function configureHttp(next: HttpOptions): void {
  Object.assign(options, next)
}

function apiOrigin(): string {
  return new URL(env.API_BASE_URL, window.location.href).origin
}

/** The XSRF header is sent only to the API origin, never to third parties. */
export function isApiOriginUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    return new URL(url, window.location.href).origin === apiOrigin()
  } catch {
    return false
  }
}

export const http: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: XSRF_COOKIE_NAME,
  xsrfHeaderName: XSRF_HEADER_NAME,
  withXSRFToken: (config) => isApiOriginUrl(config.url),
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

let refreshInFlight: Promise<boolean> | null = null
/**
 * Logical clock of successful refreshes: every request records it when it starts. A 401 on a request
 * sent before the last successful refresh carried the old cookie, so it is repeated without refreshing.
 */
let sessionGeneration = 0

/** Single-flight: concurrent 401s share the same refresh; a failure notifies `onUnauthorized` once. */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= http
    .post(REFRESH_URL)
    .then(
      () => {
        sessionGeneration += 1
        return true
      },
      () => {
        options.onUnauthorized?.()
        return false
      },
    )
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

function normalize(error: unknown): unknown {
  // Cancellations (AbortSignal from TanStack Query) are not network errors: rethrown untouched.
  if (axios.isCancel(error) || !(error instanceof AxiosError)) return error
  const response = error.response
  const header = response?.headers?.[CORRELATION_HEADER]
  return toApiError(response?.status ?? 0, response?.data, typeof header === 'string' ? header : undefined)
}

http.interceptors.request.use((config: RetriableConfig) => {
  config._generation = sessionGeneration
  return config
})

http.interceptors.response.use(undefined, async (error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 401 && error.config) {
    const config = error.config as RetriableConfig
    // Auth endpoints never trigger a refresh nor the unauthorized callback.
    const isAuthCall = AUTH_URLS.some((u) => config.url?.startsWith(u))
    if (isAuthCall) throw normalize(error)
    if (options.refresh && !config._retried) {
      config._retried = true
      // Sent before the last successful refresh: repeat it with the new cookie.
      if ((config._generation ?? sessionGeneration) < sessionGeneration) return http.request(config)
      // A 401 on the repeated request goes through this interceptor again (no second refresh).
      if (await refreshSession()) return http.request(config)
      throw normalize(error)
    }
    options.onUnauthorized?.()
  }
  throw normalize(error)
})

type RequestOptions = {
  params?: Record<string, string | number | boolean> | undefined
  signal?: AbortSignal | undefined
}

/** GET + Zod parse: the response type always comes from the schema. */
export async function getParsed<S extends z.ZodType>(
  url: string,
  schema: S,
  opts: RequestOptions = {},
): Promise<z.infer<S>> {
  const { data } = await http.get<unknown>(url, { params: opts.params, signal: opts.signal })
  return schema.parse(data)
}

/** POST/PUT/PATCH + Zod parse of the response. */
export async function sendParsed<S extends z.ZodType>(
  method: 'post' | 'put' | 'patch',
  url: string,
  body: unknown,
  schema: S,
): Promise<z.infer<S>> {
  const { data } = await http.request<unknown>({ method, url, data: body })
  return schema.parse(data)
}

export async function deleteRequest(url: string): Promise<void> {
  await http.delete(url)
}
