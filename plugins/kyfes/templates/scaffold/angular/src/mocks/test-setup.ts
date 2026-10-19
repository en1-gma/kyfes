import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetMockDb } from './handlers';
import { server } from './node';

/**
 * Il backend fetch di HttpClient usa URL relativi ("/api/…"): in Node vanno risolti
 * sull'origine di jsdom prima di arrivare a MSW.
 */
function resolveRelativeFetch(): void {
  const mswFetch = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    mswFetch(
      typeof input === 'string' && input.startsWith('/') ? new URL(input, globalThis.location.origin) : input,
      init,
    );
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  resolveRelativeFetch();
});
afterEach(() => {
  server.resetHandlers();
  resetMockDb();
});
afterAll(() => server.close());
