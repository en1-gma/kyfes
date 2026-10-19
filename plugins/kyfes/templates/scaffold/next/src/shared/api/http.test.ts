import { http as mswHttp, HttpResponse } from 'msw';
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
});
