import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { env } from '@/shared/config/env'
import { toApiError } from './api-error'

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN'
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN'
export const CORRELATION_HEADER = 'x-correlation-id'
const REFRESH_URL = '/auth/refresh'
const AUTH_URLS = ['/auth/refresh', '/auth/login', '/auth/logout']

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

type HttpOptions = {
  /** Called once when the session is gone (401 and, if enabled, the refresh failed). */
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

let refreshInFlight: Promise<void> | null = null

/** Single-flight: concurrent 401s share the same refresh request. */
function refreshSession(): Promise<void> {
  refreshInFlight ??= http
    .post(REFRESH_URL)
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

function normalize(error: unknown): unknown {
  if (axios.isCancel(error) || !(error instanceof AxiosError)) return error
  const response = error.response
  const header = response?.headers?.[CORRELATION_HEADER]
  return toApiError(response?.status ?? 0, response?.data, typeof header === 'string' ? header : undefined)
}

http.interceptors.response.use(undefined, async (error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 401 && error.config) {
    const config = error.config as RetriableConfig
    const isAuthCall = AUTH_URLS.some((u) => config.url?.startsWith(u))
    if (options.refresh && !config._retried && !isAuthCall) {
      config._retried = true
      const refreshed = await refreshSession().then(
        () => true,
        () => false,
      )
      // A 401 on the repeated request goes through this interceptor again (no second refresh).
      if (refreshed) return http.request(config)
    }
    if (!isAuthCall) options.onUnauthorized?.()
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
