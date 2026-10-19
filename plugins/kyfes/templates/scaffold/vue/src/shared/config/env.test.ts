import { describe, expect, it } from 'vitest'
import { DEFAULT_API_BASE_URL } from './constants'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('defaults API_BASE_URL to the same-origin /api', () => {
    expect(parseEnv({}).API_BASE_URL).toBe(DEFAULT_API_BASE_URL)
    expect(parseEnv({ VITE_API_BASE_URL: '/bff/api' }).API_BASE_URL).toBe('/bff/api')
  })

  it.each(['https://api.example.com', 'http://localhost:8080', '//api.example.com', 'api', '/\\evil'])(
    'rejects %s (the CSP allows only connect-src self)',
    (value) => {
      expect(() => parseEnv({ VITE_API_BASE_URL: value })).toThrow(/same-origin path/)
    },
  )
})
