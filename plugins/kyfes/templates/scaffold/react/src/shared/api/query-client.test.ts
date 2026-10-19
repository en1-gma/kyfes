import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { createQueryClient, shouldRetry } from './query-client';

const err = (status: number) => new ApiError({ status, code: 'X', message: 'x' });

describe('query client defaults', () => {
  it('never retries 4xx', () => {
    expect(shouldRetry(0, err(400))).toBe(false);
    expect(shouldRetry(0, err(404))).toBe(false);
  });

  it('retries 5xx and network errors at most twice', () => {
    expect(shouldRetry(0, err(500))).toBe(true);
    expect(shouldRetry(1, err(0))).toBe(true);
    expect(shouldRetry(2, err(503))).toBe(false);
  });

  it('uses a positive staleTime', () => {
    expect(createQueryClient().getDefaultOptions().queries?.staleTime).toBe(30_000);
  });
});
