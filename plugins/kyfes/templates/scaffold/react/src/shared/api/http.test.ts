import { http as mswHttp, HttpResponse } from 'msw';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiError } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { ApiError } from './api-error';
import { configureHttp, http, shouldSendXsrf, toApiError, XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from './http';

let unconfigure: (() => void) | undefined;
afterEach(() => {
  unconfigure?.();
  unconfigure = undefined;
});

describe('http client configuration', () => {
  it('sends cookies and uses the XSRF double-submit names', () => {
    expect(http.defaults.withCredentials).toBe(true);
    expect(http.defaults.xsrfCookieName).toBe(XSRF_COOKIE_NAME);
    expect(http.defaults.xsrfHeaderName).toBe(XSRF_HEADER_NAME);
    expect(XSRF_COOKIE_NAME).toBe('XSRF-TOKEN');
    expect(XSRF_HEADER_NAME).toBe('X-XSRF-TOKEN');
    expect(http.defaults.baseURL).toBe('/api');
    expect(http.defaults.timeout).toBeGreaterThan(0);
    expect(http.defaults.headers.Accept).toBe('application/json');
    expect(http.defaults.withXSRFToken).toBe(shouldSendXsrf);
  });

  it('adds the XSRF header only for the API origin', () => {
    expect(shouldSendXsrf({ baseURL: '/api', url: '/orders' })).toBe(true);
    expect(shouldSendXsrf({ baseURL: '/api', url: 'https://evil.example/steal' })).toBe(false);
    expect(shouldSendXsrf({ baseURL: 'https://api.example.com', url: '/orders' })).toBe(false);
  });

  it('sends X-XSRF-TOKEN read from the cookie on unsafe methods', async () => {
    document.cookie = `${XSRF_COOKIE_NAME}=abc123; path=/`;
    let header: string | null = null;
    server.use(
      mswHttp.post('/api/echo', ({ request }) => {
        header = request.headers.get(XSRF_HEADER_NAME);
        return HttpResponse.json({ ok: true });
      }),
    );
    await http.post('/echo', {});
    expect(header).toBe('abc123');
    document.cookie = `${XSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
});

describe('error normalisation', () => {
  it('turns backend errors into ApiError with correlationId', async () => {
    server.use(mswHttp.get('/api/boom', () => apiError(500, 'INTERNAL', 'Database exploded')));
    const error = await http.get('/boom').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, code: 'INTERNAL' });
    expect((error as ApiError).correlationId).toMatch(/^mock-/);
  });

  it('keeps field errors and falls back to the correlation header', async () => {
    server.use(
      mswHttp.post('/api/invalid', () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Invalid', fieldErrors: { total: ['too big'] } },
          { status: 422, headers: { 'x-correlation-id': 'from-header' } },
        ),
      ),
    );
    const error = await http.post('/invalid', {}).catch((e: unknown) => e);
    expect(error).toMatchObject({
      status: 422,
      correlationId: 'from-header',
      fieldErrors: { total: ['too big'] },
    });
  });

  it('handles bodies that do not follow the contract and network errors', async () => {
    server.use(
      mswHttp.get('/api/html', () => new HttpResponse('<h1>Bad gateway</h1>', { status: 502 })),
      mswHttp.get('/api/down', () => HttpResponse.error()),
    );
    await expect(http.get('/html')).rejects.toMatchObject({ status: 502, code: 'HTTP_502' });
    await expect(http.get('/down')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(toApiError(new Error('x'))).toMatchObject({ status: 0, code: 'UNKNOWN' });
  });
});

describe('401 / 403 handling', () => {
  it('calls onUnauthorized when the session cannot be refreshed', async () => {
    const onUnauthorized = vi.fn();
    unconfigure = configureHttp({ onUnauthorized, refreshOnUnauthorized: false });
    server.use(mswHttp.get('/api/private', () => apiError(401, 'UNAUTHENTICATED', 'Login required')));
    await expect(http.get('/private')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('refreshes once (single-flight) and retries the original requests', async () => {
    const onUnauthorized = vi.fn();
    unconfigure = configureHttp({ onUnauthorized, refreshOnUnauthorized: true });
    let refreshed = false;
    let refreshCalls = 0;
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshCalls += 1;
        refreshed = true;
        return new HttpResponse(null, { status: 204 });
      }),
      mswHttp.get('/api/private/:n', ({ params }) =>
        refreshed ? HttpResponse.json({ n: params.n }) : apiError(401, 'UNAUTHENTICATED', 'Expired'),
      ),
    );
    const [a, b] = await Promise.all([http.get('/private/1'), http.get('/private/2')]);
    expect(a.data).toEqual({ n: '1' });
    expect(b.data).toEqual({ n: '2' });
    expect(refreshCalls).toBe(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('retries only once and then gives up', async () => {
    const onUnauthorized = vi.fn();
    unconfigure = configureHttp({ onUnauthorized, refreshOnUnauthorized: true });
    let calls = 0;
    server.use(
      mswHttp.get('/api/always-401', () => {
        calls += 1;
        return apiError(401, 'UNAUTHENTICATED', 'Expired');
      }),
    );
    await expect(http.get('/always-401')).rejects.toMatchObject({ status: 401 });
    expect(calls).toBe(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('calls onForbidden on 403', async () => {
    const onForbidden = vi.fn();
    unconfigure = configureHttp({ onForbidden });
    server.use(mswHttp.delete('/api/orders/x', () => apiError(403, 'FORBIDDEN', 'No')));
    await expect(http.delete('/orders/x')).rejects.toMatchObject({ status: 403 });
    expect(onForbidden).toHaveBeenCalledTimes(1);
  });
});

describe('refresh and cancellation edge cases', () => {
  it('does not refresh again for a request that started before a completed refresh', async () => {
    unconfigure = configureHttp({ onUnauthorized: vi.fn(), refreshOnUnauthorized: true });
    let refreshCalls = 0;
    let refreshed = false;
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshCalls += 1;
        refreshed = true;
        return new HttpResponse(null, { status: 204 });
      }),
      // Sent with the old cookie, answered with 401 only after the other request has refreshed.
      mswHttp.get('/api/slow', async () => {
        if (refreshCalls > 0) return HttpResponse.json({ ok: true });
        while (!refreshed) await new Promise((r) => setTimeout(r, 5));
        return apiError(401, 'UNAUTHENTICATED', 'Expired');
      }),
      mswHttp.get('/api/fast', () =>
        refreshed ? HttpResponse.json({ ok: true }) : apiError(401, 'UNAUTHENTICATED', 'Expired'),
      ),
    );
    const slow = http.get('/slow');
    await http.get('/fast');
    await expect(slow).resolves.toMatchObject({ data: { ok: true } });
    expect(refreshCalls).toBe(1);
  });

  it('calls onUnauthorized once when a refresh fails for concurrent requests', async () => {
    const onUnauthorized = vi.fn();
    unconfigure = configureHttp({ onUnauthorized, refreshOnUnauthorized: true });
    server.use(
      mswHttp.post('/api/auth/refresh', () => apiError(401, 'UNAUTHENTICATED', 'Expired')),
      mswHttp.get('/api/private/:n', () => apiError(401, 'UNAUTHENTICATED', 'Expired')),
    );
    await Promise.allSettled([http.get('/private/1'), http.get('/private/2'), http.get('/private/3')]);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('passes cancellations through instead of turning them into network errors', async () => {
    server.use(mswHttp.get('/api/hang', () => new Promise<never>(() => undefined)));
    const controller = new AbortController();
    const pending = http.get('/hang', { signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    const error = await pending;
    expect(axios.isCancel(error)).toBe(true);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});
