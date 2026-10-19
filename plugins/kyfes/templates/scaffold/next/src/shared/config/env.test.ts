import { describe, expect, it } from 'vitest';
import { isValidApiBaseUrl } from './env';

describe('API_BASE_URL', () => {
  it.each(['/api', '/backend/v1', 'https://api.example.com'])('accepts %s', (value) => {
    expect(isValidApiBaseUrl(value)).toBe(true);
  });

  it.each(['//evil.example', '/\\evil.example', 'api', 'javascript:x'])('rejects %s', (value) => {
    expect(isValidApiBaseUrl(value)).toBe(false);
  });
});
