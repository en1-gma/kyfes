import { setupServer } from 'msw/node'
import { createHandlers } from './handlers'

export const server = setupServer(...createHandlers())
