import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW server for Vitest (see src/test/setup.ts). */
export const server = setupServer(...handlers);
