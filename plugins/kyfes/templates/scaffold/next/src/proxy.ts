import { NextResponse, type NextRequest } from 'next/server';
import { CSP_HEADER, NONCE_HEADER, buildCsp } from '@/shared/config/csp';
import { IS_DEV } from '@/shared/config/runtime';

/** Per-request CSP with nonce (Next 16: `proxy.ts` replaces `middleware.ts`). */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce, IS_DEV);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set(CSP_HEADER, csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not /api and /api/* (proxied to the backend), static assets or prefetches.
      // `api(?:/|$)` keeps pages such as /apidocs or /api-keys under the CSP.
      source: '/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|mockServiceWorker.js).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
