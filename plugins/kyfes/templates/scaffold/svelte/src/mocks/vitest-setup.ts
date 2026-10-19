import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { changeLocale } from '$lib/shared/i18n';
import { resetMockDb } from './handlers';
import { server } from './node';

// Tests assert on the Italian catalog (jsdom's navigator.language is en-US).
changeLocale('it');

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
	server.resetHandlers();
	resetMockDb();
});
afterAll(() => server.close());
