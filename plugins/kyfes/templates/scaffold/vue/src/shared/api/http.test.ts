import axios from 'axios'
import { http as mswHttp, HttpResponse } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { server } from '@/mocks/node'
import { ApiError } from './api-error'
import { configureHttp, http, isApiOriginUrl, XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from './http'
import { shouldRetry } from './query-client'

afterEach(() => configureHttp({ onUnauthorized: undefined, refresh: false }))

describe('http client', () => {
  it('sends cookies and uses the XSRF double-submit config', () => {
    expect(http.defaults.withCredentials).toBe(true)
    expect(http.defaults.xsrfCookieName).toBe(XSRF_COOKIE_NAME)
    expect(http.defaults.xsrfHeaderName).toBe(XSRF_HEADER_NAME)
    expect(http.defaults.baseURL).toBe('/api')
    expect(http.defaults.headers.Accept).toBe('application/json')
  })

  it('sends the XSRF header only to the API origin', () => {
    expect(isApiOriginUrl('/api/orders')).toBe(true)
    expect(isApiOriginUrl(`${window.location.origin}/api/orders`)).toBe(true)
    expect(isApiOriginUrl('https://third-party.example/x')).toBe(false)
  })

  it('attaches X-XSRF-TOKEN from the cookie on unsafe methods', async () => {
    document.cookie = `${XSRF_COOKIE_NAME}=abc123; path=/`
    let header: string | null = null
    server.use(
      mswHttp.post('/api/echo', ({ request }) => {
        header = request.headers.get(XSRF_HEADER_NAME)
        return HttpResponse.json({ ok: true })
      }),
    )
    await http.post('/echo', {})
    expect(header).toBe('abc123')
  })

  it('normalizes errors into ApiError with correlationId', async () => {
    server.use(
      mswHttp.get('/api/boom', () =>
        HttpResponse.json(
          { code: 'INTERNAL', message: 'db down', correlationId: 'corr-42' },
          { status: 500 },
        ),
      ),
    )
    const error = await http.get('/boom').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 500, code: 'INTERNAL', correlationId: 'corr-42' })
  })

  it('falls back to the correlation header for non-standard bodies', async () => {
    server.use(
      mswHttp.get(
        '/api/raw',
        () => new HttpResponse('oops', { status: 502, headers: { 'x-correlation-id': 'h-1' } }),
      ),
    )
    const error = await http.get('/raw').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 502, code: 'HTTP_502', correlationId: 'h-1' })
  })

  it('calls onUnauthorized on 401', async () => {
    const onUnauthorized = vi.fn()
    configureHttp({ onUnauthorized, refresh: false })
    server.use(
      mswHttp.get('/api/private', () =>
        HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'x' }, { status: 401 }),
      ),
    )
    await expect(http.get('/private')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('refreshes once (single-flight) and repeats the request', async () => {
    const onUnauthorized = vi.fn()
    configureHttp({ onUnauthorized, refresh: true })
    let refreshCalls = 0
    let authenticated = false
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshCalls += 1
        authenticated = true
        return new HttpResponse(null, { status: 204 })
      }),
      mswHttp.get('/api/data', () =>
        authenticated
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ code: 'U', message: 'x' }, { status: 401 }),
      ),
    )
    const [a, b] = await Promise.all([http.get('/data'), http.get('/data')])
    expect(a.data).toEqual({ ok: true })
    expect(b.data).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('gives up after a failed refresh, notifying onUnauthorized once for concurrent 401s', async () => {
    const onUnauthorized = vi.fn()
    configureHttp({ onUnauthorized, refresh: true })
    server.use(
      mswHttp.get('/api/data', () => HttpResponse.json({ code: 'U', message: 'x' }, { status: 401 })),
    )
    const results = await Promise.allSettled([http.get('/data'), http.get('/data')])
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected'])
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('repeats without a new refresh a request sent before the last successful refresh', async () => {
    configureHttp({ onUnauthorized: vi.fn(), refresh: true })
    let refreshCalls = 0
    let authenticated = false
    let slowCalls = 0
    let release = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const unauthorized = () => HttpResponse.json({ code: 'U', message: 'x' }, { status: 401 })
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshCalls += 1
        authenticated = true
        return new HttpResponse(null, { status: 204 })
      }),
      // Sent with the expired cookie: its 401 arrives after the refresh is already over.
      mswHttp.get('/api/slow', async () => {
        slowCalls += 1
        if (slowCalls > 1) return HttpResponse.json({ ok: 'slow' })
        await gate
        return unauthorized()
      }),
      mswHttp.get('/api/fast', () => (authenticated ? HttpResponse.json({ ok: 'fast' }) : unauthorized())),
    )
    const slow = http.get('/slow')
    await vi.waitFor(() => expect(slowCalls).toBe(1))
    expect((await http.get('/fast')).data).toEqual({ ok: 'fast' })
    release()
    expect((await slow).data).toEqual({ ok: 'slow' })
    expect(refreshCalls).toBe(1)
  })

  it('never refreshes nor notifies on 401 from the auth endpoints', async () => {
    const onUnauthorized = vi.fn()
    configureHttp({ onUnauthorized, refresh: true })
    let refreshCalls = 0
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json({ code: 'U', message: 'x' }, { status: 401 })
      }),
      mswHttp.post('/api/auth/logout', () => HttpResponse.json({ code: 'U', message: 'x' }, { status: 401 })),
    )
    await expect(http.post('/auth/logout')).rejects.toMatchObject({ status: 401 })
    expect(refreshCalls).toBe(0)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('rethrows cancellations as they are (not as NETWORK_ERROR)', async () => {
    server.use(mswHttp.get('/api/never', () => new Promise<Response>(() => {})))
    const controller = new AbortController()
    const pending = http.get('/never', { signal: controller.signal }).catch((e: unknown) => e)
    controller.abort()
    const error = await pending
    expect(axios.isCancel(error)).toBe(true)
    expect(error).not.toBeInstanceOf(ApiError)
  })
})

describe('query retry policy', () => {
  it('retries only network errors and 5xx, at most twice', () => {
    const e0 = new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' })
    const e403 = new ApiError({ status: 403, code: 'FORBIDDEN', message: 'x' })
    const e500 = new ApiError({ status: 500, code: 'INTERNAL', message: 'x' })
    expect(shouldRetry(0, e0)).toBe(true)
    expect(shouldRetry(0, e403)).toBe(false)
    expect(shouldRetry(0, e500)).toBe(true)
    expect(shouldRetry(2, e500)).toBe(false)
  })

  it('never retries non-HTTP errors (e.g. a response that fails the Zod schema)', () => {
    const zodError = z.object({ id: z.string() }).safeParse({}).error
    expect(shouldRetry(0, zodError)).toBe(false)
    expect(shouldRetry(0, new Error('boom'))).toBe(false)
  })
})
