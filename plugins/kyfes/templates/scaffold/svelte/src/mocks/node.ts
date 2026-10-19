import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW for Vitest (see vitest-setup.ts). */
export const server = setupServer(...handlers);
