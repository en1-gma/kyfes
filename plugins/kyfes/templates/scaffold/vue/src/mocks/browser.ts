import { setupWorker } from 'msw/browser'
import { createHandlers } from './handlers'

import type { MockUser } from './data'

// Dev only (VITE_API_MOCKS=true). Pick the mock user with VITE_MOCK_USER=manager|operator|viewer.
const requested = import.meta.env.VITE_MOCK_USER
const user: MockUser = requested === 'viewer' || requested === 'operator' ? requested : 'manager'

export const worker = setupWorker(...createHandlers(user))
