import axios from 'axios';
import { delay, http as mswHttp, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { ApiError } from './api-error';
import { http, setOnUnauthorized, setRefreshPath, shouldSendXsrf } from './http';

afterEach(() => {
  setOnUnauthorized(null);
  setRefreshPath('/auth/refresh');
});

describe('http client', () => {
  it('sends cookies and is configured for double-submit XSRF', () => {
    expect(http.defaults.withCredentials).toBe(true);
    expect(http.defaults.xsrfCookieName).toBe('XSRF-TOKEN');
    expect(http.defaults.xsrfHeaderName).toBe('X-XSRF-TOKEN');
    expect(http.defaults.baseURL).toBe('/api');
    expect(http.defaults.timeout).toBeGreaterThan(0);
    expect(http.defaults.headers.Accept).toBe('application/json');
  });

  it('sends the XSRF header only to the API origin', () => {
    expect(shouldSendXsrf({ baseURL: '/api', url: '/orders' })).toBe(true);
    expect(shouldSendXsrf({ baseURL: '/api', url: 'https://evil.example.com/x' })).toBe(false);
    expect(shouldSendXsrf({ baseURL: '/api', url: '//evil.example.com/x' })).toBe(false);
    expect(shouldSendXsrf({ baseURL: 'https://evil.example.com', url: '/orders' })).toBe(false);
    expect(shouldSendXsrf({ baseURL: '//evil.example.com', url: '/orders' })).toBe(false);
  });

  it('rethrows cancellations as-is (not a NETWORK_ERROR)', async () => {
    server.use(
      mswHttp.get('/api/slow-cancel', async () => {
        await delay(200);
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const pending = http
      .get('/slow-cancel', { signal: controller.signal })
      .catch((e: unknown) => e);
    controller.abort();
    const error = await pending;
    expect(axios.isCancel(error)).toBe(true);
    expect(error).not.toBeInstanceOf(ApiError);
  });

  it('normalizes errors into ApiError with correlationId', async () => {
    server.use(
      mswHttp.get('/api/boom', () =>
        HttpResponse.json(
          { code: 'INTERNAL', message: 'Unexpected', correlationId: 'corr-123' },
          { status: 500 },
        ),
      ),
    );
    const error = await http.get('/boom').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, code: 'INTERNAL', correlationId: 'corr-123' });
  });

  it('reads the correlationId from the response header when the body has none', async () => {
    server.use(
      mswHttp.get('/api/teapot', () =>
        HttpResponse.json({}, { status: 418, headers: { 'X-Correlation-Id': 'hdr-1' } }),
      ),
    );
    await expect(http.get('/teapot')).rejects.toMatchObject({
      status: 418,
      correlationId: 'hdr-1',
    });
  });

  it('calls onUnauthorized on 401 when the refresh fails', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    server.use(
      mswHttp.get('/api/private', () =>
        HttpResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 }),
      ),
    );
    await expect(http.get('/private')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('refreshes once (single-flight) and retries the original requests', async () => {
    let refreshed = false;
    let refreshCalls = 0;
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshCalls += 1;
        refreshed = true;
        return new HttpResponse(null, { status: 204 });
      }),
      mswHttp.get('/api/data', () =>
        refreshed ? HttpResponse.json({ ok: true }) : HttpResponse.json({}, { status: 401 }),
      ),
    );
    const [a, b] = await Promise.all([http.get('/data'), http.get('/data')]);
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
  });

  it('does not refresh again for a slow request that started before a successful refresh', async () => {
    let refreshCalls = 0;
    let refreshed = false;
    let slowCalls = 0;
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshCalls += 1;
        refreshed = true;
        return new HttpResponse(null, { status: 204 });
      }),
      mswHttp.get('/api/fast', () =>
        refreshed ? HttpResponse.json({ ok: 'fast' }) : HttpResponse.json({}, { status: 401 }),
      ),
      // Sent with the expired cookie: its 401 arrives after the refresh has already completed.
      mswHttp.get('/api/slow', async () => {
        slowCalls += 1;
        if (slowCalls === 1) {
          await delay(150);
          return HttpResponse.json({}, { status: 401 });
        }
        return HttpResponse.json({ ok: 'slow' });
      }),
    );
    const slow = http.get('/slow');
    const fast = await http.get('/fast');
    expect(fast.data).toEqual({ ok: 'fast' });
    expect(refreshCalls).toBe(1);
    expect((await slow).data).toEqual({ ok: 'slow' });
    expect(refreshCalls).toBe(1);
    expect(slowCalls).toBe(2);
  });

  it('a failed refresh reports onUnauthorized once for concurrent requests', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    let refreshCalls = 0;
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({}, { status: 401 });
      }),
      mswHttp.get('/api/locked', () => HttpResponse.json({}, { status: 401 })),
    );
    const results = await Promise.allSettled([
      http.get('/locked'),
      http.get('/locked'),
      http.get('/locked'),
    ]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('refreshes /auth/me (expired access, valid refresh) without reporting failures', async () => {
    let refreshed = false;
    server.use(
      mswHttp.post('/api/auth/refresh', () => {
        refreshed = true;
        return new HttpResponse(null, { status: 204 });
      }),
      mswHttp.get('/api/auth/me', () =>
        refreshed ? HttpResponse.json({ ok: true }) : HttpResponse.json({}, { status: 401 }),
      ),
    );
    await expect(http.get('/auth/me')).resolves.toMatchObject({ data: { ok: true } });
  });

  it('a failed refresh triggered by /auth/me does not call onUnauthorized (no loop)', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    server.use(mswHttp.get('/api/auth/me', () => HttpResponse.json({}, { status: 401 })));
    await expect(http.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it.each(['/auth/refresh', '/auth/login', '/auth/logout'])(
    '%s never triggers a refresh nor onUnauthorized',
    async (path) => {
      const onUnauthorized = vi.fn();
      setOnUnauthorized(onUnauthorized);
      let refreshCalls = 0;
      server.use(
        mswHttp.all(`/api${path}`, () => {
          refreshCalls += 1;
          return HttpResponse.json({}, { status: 401 });
        }),
      );
      await expect(http.post(path)).rejects.toMatchObject({ status: 401 });
      expect(refreshCalls).toBe(1);
      expect(onUnauthorized).not.toHaveBeenCalled();
    },
  );

  it('keeps fieldErrors as string arrays (backend contract)', async () => {
    server.use(
      mswHttp.post('/api/invalid', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: 'Invalid',
            correlationId: 'c-422',
            fieldErrors: { total: ['too big'] },
          },
          { status: 422 },
        ),
      ),
    );
    await expect(http.post('/invalid')).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      correlationId: 'c-422',
      fieldErrors: { total: ['too big'] },
    });
  });
});
