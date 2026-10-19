import { type HttpErrorResponse } from '@angular/common/http';
import * as z from 'zod';

/** Formato degli errori del backend (compatibile con kybes). */
const ErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  correlationId: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type FieldErrors = Record<string, string[]>;

/** Codici di errore generati dal client (gli altri arrivano dal backend o sono `HTTP_<status>`). */
export const API_ERROR_CODE = {
  network: 'NETWORK_ERROR',
  invalidResponse: 'INVALID_RESPONSE',
} as const;

/** Unico tipo di errore che i componenti vedono: mai `HttpErrorResponse`. */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly correlationId: string | null = null,
    readonly fieldErrors: FieldErrors | null = null,
  ) {
    super(message);
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  static fromHttpError(error: HttpErrorResponse): ApiError {
    const parsed = ErrorBodySchema.safeParse(error.error);
    const headerId = error.headers?.get('X-Correlation-Id') ?? null;
    if (parsed.success) {
      const body = parsed.data;
      return new ApiError(
        error.status,
        body.code,
        body.message,
        body.correlationId ?? headerId,
        body.fieldErrors ?? null,
      );
    }
    const code = error.status === 0 ? API_ERROR_CODE.network : `HTTP_${error.status}`;
    return new ApiError(error.status, code, error.statusText || code, headerId);
  }

  static invalidResponse(): ApiError {
    return new ApiError(0, API_ERROR_CODE.invalidResponse, 'Invalid response payload');
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
