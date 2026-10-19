import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError } from './api-error';
import { shouldRetry } from './query-client';

const apiError = (status: number) => new ApiError({ status, code: `HTTP_${status}`, message: 'x' });

describe('shouldRetry', () => {
  it.each([0, 500, 503])('retries transient failures (status %s) at most twice', (status) => {
    expect(shouldRetry(0, apiError(status))).toBe(true);
    expect(shouldRetry(1, apiError(status))).toBe(true);
    expect(shouldRetry(2, apiError(status))).toBe(false);
  });

  it.each([400, 401, 403, 404, 422])('never retries %s', (status) => {
    expect(shouldRetry(0, apiError(status))).toBe(false);
  });

  it('never retries an invalid payload (ZodError) or other non-HTTP errors', () => {
    const zodError = z.object({ id: z.string() }).safeParse({}).error;
    expect(shouldRetry(0, zodError)).toBe(false);
    expect(shouldRetry(0, new TypeError('boom'))).toBe(false);
  });
});
