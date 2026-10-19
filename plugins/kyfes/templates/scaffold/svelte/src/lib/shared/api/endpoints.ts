/** BFF auth endpoints (relative to PUBLIC_API_BASE_URL): shared/auth and the HTTP client use these. */
export const AUTH_ENDPOINTS = {
	me: '/auth/me',
	login: '/auth/login',
	logout: '/auth/logout',
	refresh: '/auth/refresh'
} as const;
