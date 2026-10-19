import { type HttpErrorResponse } from '@angular/common/http';
import * as z from 'zod';
import { API_ERROR_CODE, CORRELATION_ID_HEADER } from '@shared/config/constants';

export { API_ERROR_CODE } from '@shared/config/constants';

/** Formato degli errori del backend (compatibile con kybes). */
const ErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  correlationId: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type FieldErrors = Record<string, string[]>;

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
    const headerId = error.headers?.get(CORRELATION_ID_HEADER) ?? null;
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
