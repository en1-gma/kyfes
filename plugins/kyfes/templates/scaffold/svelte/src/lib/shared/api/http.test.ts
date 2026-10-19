import axios from 'axios';
import { delay, http as mswHttp, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../../mocks/node';
import { AUTH_ENDPOINTS, XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from '$lib/shared/config/constants';
import { ApiError } from './api-error';
import { enableSessionRefresh, http, isSameOrigin, onUnauthorized } from './http';

afterEach(() => {
	onUnauthorized(undefined);
	enableSessionRefresh(false);
});

describe('http client', () => {
	it('sends cookies and the XSRF header only to the same origin', () => {
		expect(http.defaults.withCredentials).toBe(true);
		expect(http.defaults.xsrfCookieName).toBe(XSRF_COOKIE_NAME);
		expect(http.defaults.xsrfHeaderName).toBe(XSRF_HEADER_NAME);
		expect(http.defaults.baseURL).toBe('/api');
		expect(http.defaults.headers.Accept).toBe('application/json');
		expect(isSameOrigin('/api/orders')).toBe(true);
		expect(isSameOrigin('https://evil.example/api')).toBe(false);
	});

	it('sends X-XSRF-TOKEN read from the cookie on unsafe methods', async () => {
		document.cookie = `${XSRF_COOKIE_NAME}=abc123; path=/`;
		let header: string | null = null;
		server.use(
			mswHttp.post('/api/echo', ({ request }) => {
				header = request.headers.get(XSRF_HEADER_NAME);
				return HttpResponse.json({ ok: true });
			})
		);
		await http.post('/echo', {});
		expect(header).toBe('abc123');
		document.cookie = `${XSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
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

	it('repeats without a new refresh a 401 of a request sent before the last refresh', async () => {
		enableSessionRefresh(true);
		let refreshed = false;
		let refreshCalls = 0;
		let releaseSlow: () => void = () => {};
		const slowGate = new Promise<void>((resolve) => {
			releaseSlow = resolve;
		});
		let slowCalls = 0;
		server.use(
			mswHttp.post('/api/auth/refresh', () => {
				refreshCalls += 1;
				refreshed = true;
				return new HttpResponse(null, { status: 204 });
			}),
			mswHttp.get('/api/fast', () =>
				refreshed
					? HttpResponse.json({ ok: 'fast' })
					: HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Login' }, { status: 401 })
			),
			// Sent with the old cookie: the 401 arrives only after the refresh has completed.
			mswHttp.get('/api/slow', async () => {
				slowCalls += 1;
				if (slowCalls > 1) return HttpResponse.json({ ok: 'slow' });
				await slowGate;
				return HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Login' }, { status: 401 });
			})
		);
		const slow = http.get('/slow');
		await delay(10);
		const fast = await http.get('/fast');
		expect(fast.data).toEqual({ ok: 'fast' });
		releaseSlow();
		expect((await slow).data).toEqual({ ok: 'slow' });
		expect(refreshCalls).toBe(1);
	});

	it('calls onUnauthorized once when the refresh itself fails', async () => {
		enableSessionRefresh(true);
		const handler = vi.fn();
		onUnauthorized(handler);
		let refreshCalls = 0;
		server.use(
			mswHttp.post('/api/auth/refresh', () => {
				refreshCalls += 1;
				return HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Login' }, { status: 401 });
			}),
			mswHttp.get('/api/data', () =>
				HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Login' }, { status: 401 })
			)
		);
		const results = await Promise.allSettled([http.get('/data'), http.get('/data')]);
		expect(results.every((result) => result.status === 'rejected')).toBe(true);
		expect(refreshCalls).toBe(1);
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it.each([AUTH_ENDPOINTS.login, AUTH_ENDPOINTS.logout, AUTH_ENDPOINTS.refresh])(
		'a 401 on %s triggers neither the refresh nor onUnauthorized',
		async (path) => {
			enableSessionRefresh(true);
			const handler = vi.fn();
			onUnauthorized(handler);
			let refreshCalls = 0;
			server.use(
				mswHttp.all(`/api${path}`, () => {
					refreshCalls += path === AUTH_ENDPOINTS.refresh ? 1 : 0;
					return HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Login' }, { status: 401 });
				})
			);
			await expect(http.post(path)).rejects.toMatchObject({ status: 401 });
			expect(refreshCalls).toBe(path === AUTH_ENDPOINTS.refresh ? 1 : 0);
			expect(handler).not.toHaveBeenCalled();
		}
	);

	it('rethrows cancellations as they are, not as network errors', async () => {
		server.use(
			mswHttp.get('/api/never', async () => {
				await delay('infinite');
				return HttpResponse.json({});
			})
		);
		const controller = new AbortController();
		const pending = http.get('/never', { signal: controller.signal }).catch((e: unknown) => e);
		controller.abort();
		const error = await pending;
		expect(axios.isCancel(error)).toBe(true);
		expect(error).not.toBeInstanceOf(ApiError);
	});
});
