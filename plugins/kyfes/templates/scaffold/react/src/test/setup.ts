import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { db } from '@/mocks/data';
import { server } from '@/mocks/node';
import { ORDERS_NS } from '@/features/orders';
import { COMMON_NS, i18n, initI18n } from '@/shared/i18n';

// jsdom has no layout engine: Recharts' responsive mode needs ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

beforeAll(async () => {
  server.listen({ onUnhandledFrame: 'error' });
  await initI18n('it');
  await i18n.loadNamespaces([COMMON_NS, ORDERS_NS]);
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  db.reset();
});

afterAll(() => {
  server.close();
});
