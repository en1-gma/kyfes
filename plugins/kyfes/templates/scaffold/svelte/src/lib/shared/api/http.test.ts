import { http as mswHttp, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../../mocks/node';
import { ApiError } from './api-error';
import { enableSessionRefresh, http, isSameOrigin, onUnauthorized } from './http';

afterEach(() => {
	onUnauthorized(undefined);
	enableSessionRefresh(false);
});

describe('http client', () => {
	it('sends cookies and the XSRF header only to the same origin', () => {
		expect(http.defaults.withCredentials).toBe(true);
		expect(http.defaults.xsrfCookieName).toBe('XSRF-TOKEN');
		expect(http.defaults.xsrfHeaderName).toBe('X-XSRF-TOKEN');
		expect(http.defaults.baseURL).toBe('/api');
		expect(http.defaults.headers.Accept).toBe('application/json');
		expect(isSameOrigin('/api/orders')).toBe(true);
		expect(isSameOrigin('https://evil.example/api')).toBe(false);
	});

	it('sends X-XSRF-TOKEN read from the cookie on unsafe methods', async () => {
		document.cookie = 'XSRF-TOKEN=abc123; path=/';
		let header: string | null = null;
		server.use(
			mswHttp.post('/api/echo', ({ request }) => {
				header = request.headers.get('X-XSRF-TOKEN');
				return HttpResponse.json({ ok: true });
			})
		);
		await http.post('/echo', {});
		expect(header).toBe('abc123');
		document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
	});

	it('normalizes errors into ApiError with correlationId', async () => {
		server.use(
			mswHttp.get('/api/boom', () =>
				HttpResponse.json(
					{ code: 'INTERNAL', message: 'Boom', correlationId: 'corr-42' },
					{ status: 500 }
				)
			)
		);
		const error = await http.get('/boom').catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({ status: 500, code: 'INTERNAL', correlationId: 'corr-42' });
	});

	it('maps a non-JSON error body to a generic code', async () => {
		server.use(mswHttp.get('/api/plain', () => new HttpResponse('nope', { status: 502 })));
		const error = await http.get('/plain').catch((e: unknown) => e);
		expect(error).toMatchObject({ status: 502, code: 'HTTP_502' });
	});

	it('calls the onUnauthorized callback on 401', async () => {
		const handler = vi.fn();
		onUnauthorized(handler);
		server.use(
			mswHttp.get('/api/private', () =>
				HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Login' }, { status: 401 })
			)
		);
		await expect(http.get('/private')).rejects.toMatchObject({ status: 401 });
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('refreshes once (single-flight) and repeats the request when refresh is enabled', async () => {
		enableSessionRefresh(true);
		const handler = vi.fn();
		onUnauthorized(handler);
		let refreshed = false;
		let refreshCalls = 0;
		server.use(
			mswHttp.post('/api/auth/refresh', () => {
				refreshCalls += 1;
				refreshed = true;
				return new HttpResponse(null, { status: 204 });
			}),
			mswHttp.get('/api/data', () =>
				refreshed
					? HttpResponse.json({ ok: true })
					: HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Login' }, { status: 401 })
			)
		);
		const [a, b] = await Promise.all([http.get('/data'), http.get('/data')]);
		expect(a.data).toEqual({ ok: true });
		expect(b.data).toEqual({ ok: true });
		expect(refreshCalls).toBe(1);
		expect(handler).not.toHaveBeenCalled();
	});
});
