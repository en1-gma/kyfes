import * as z from 'zod';
import { ApiError } from './api-error';
import { shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it.each([
    [new ApiError(0, 'NETWORK_ERROR', 'offline'), true],
    [new ApiError(500, 'INTERNAL', 'boom'), true],
    [new ApiError(503, 'HTTP_503', 'unavailable'), true],
    [new ApiError(400, 'VALIDATION_ERROR', 'bad'), false],
    [new ApiError(401, 'UNAUTHENTICATED', 'login'), false],
    [new ApiError(404, 'NOT_FOUND', 'missing'), false],
    [ApiError.invalidResponse(), false],
  ])('%o → %s', (error, expected) => {
    expect(shouldRetry(0, error)).toBe(expected);
  });

  it('non ripete errori non HTTP (ZodError, cancellazioni, Error generici)', () => {
    const zodError = z.string().safeParse(1).error;
    expect(shouldRetry(0, zodError)).toBe(false);
    expect(shouldRetry(0, new DOMException('aborted', 'AbortError'))).toBe(false);
    expect(shouldRetry(0, new Error('bug'))).toBe(false);
  });

  it('al massimo 2 tentativi', () => {
    const error = new ApiError(500, 'INTERNAL', 'boom');
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });
});
