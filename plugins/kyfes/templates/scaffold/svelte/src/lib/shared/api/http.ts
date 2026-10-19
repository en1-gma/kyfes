import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { env } from '$lib/shared/config';
import { ApiError, ApiErrorBodySchema } from './api-error';

/** The only HTTP client of the app. Components never use it directly: features/<f>/api does. */

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const REFRESH_URL = '/auth/refresh';

type UnauthorizedHandler = () => void;
type RetriableConfig = InternalAxiosRequestConfig & { _kyfesRetried?: boolean };

let unauthorizedHandler: UnauthorizedHandler | undefined;
let refreshEnabled = false;
let refreshInFlight: Promise<boolean> | undefined;

/** Registers what to do on a 401 (shared/auth: invalidate the session and go to login). */
export function onUnauthorized(handler: UnauthorizedHandler | undefined): void {
	unauthorizedHandler = handler;
}

/** Enable only if the BFF exposes POST /api/auth/refresh. */
export function enableSessionRefresh(enabled: boolean): void {
	refreshEnabled = enabled;
}

/** The XSRF header is sent only to the API origin (same origin as the app). */
export function isSameOrigin(url: string | undefined): boolean {
	if (typeof window === 'undefined' || !url) return false;
	try {
		return new URL(url, window.location.origin).origin === window.location.origin;
	} catch {
		return false;
	}
}

export const http: AxiosInstance = axios.create({
	baseURL: env.API_BASE_URL,
	withCredentials: true,
	xsrfCookieName: XSRF_COOKIE_NAME,
	xsrfHeaderName: XSRF_HEADER_NAME,
	withXSRFToken: (config) => isSameOrigin(config.url),
	timeout: 15_000,
	headers: { Accept: 'application/json' }
});

export function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error;
	if (error instanceof AxiosError) {
		const status = error.response?.status ?? 0;
		const parsed = ApiErrorBodySchema.safeParse(error.response?.data);
		const headerId = error.response?.headers?.['x-correlation-id'];
		const correlationId =
			(parsed.success ? parsed.data.correlationId : undefined) ??
			(typeof headerId === 'string' ? headerId : undefined);
		if (parsed.success) {
			return new ApiError({ status, ...parsed.data, correlationId });
		}
		const code =
			error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT
				? 'TIMEOUT'
				: status === 0
					? 'NETWORK_ERROR'
					: `HTTP_${status}`;
		return new ApiError({ status, code, message: error.message, correlationId });
	}
	return new ApiError({ status: 0, code: 'UNKNOWN', message: String(error) });
}

/** Single-flight: concurrent 401s share one refresh request. */
function refreshSession(client: AxiosInstance): Promise<boolean> {
	refreshInFlight ??= client
		.post(REFRESH_URL, undefined, { _kyfesRetried: true } as RetriableConfig)
		.then(() => true)
		.catch(() => false)
		.finally(() => {
			refreshInFlight = undefined;
		});
	return refreshInFlight;
}

export function installInterceptors(client: AxiosInstance): void {
	client.interceptors.response.use(undefined, async (error: unknown) => {
		// Cancellations (AbortSignal from TanStack Query) are not errors for the UI.
		if (axios.isCancel(error)) throw error;
		const apiError = toApiError(error);
		const config =
			error instanceof AxiosError ? (error.config as RetriableConfig | undefined) : undefined;
		if (apiError.isUnauthorized) {
			if (refreshEnabled && config && !config._kyfesRetried) {
				config._kyfesRetried = true;
				if (await refreshSession(client)) return client.request(config);
			}
			unauthorizedHandler?.();
		}
		throw apiError;
	});
}

installInterceptors(http);
