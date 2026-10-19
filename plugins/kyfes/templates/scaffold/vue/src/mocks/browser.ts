import { setupWorker } from 'msw/browser'
import { createHandlers } from './handlers'

// Dev only (VITE_API_MOCKS=true). Pick the mock user with VITE_MOCK_USER=manager|viewer.
const user = import.meta.env.VITE_MOCK_USER === 'viewer' ? 'viewer' : 'manager'

export const worker = setupWorker(...createHandlers(user))
