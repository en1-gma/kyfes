import { z } from 'zod';

/** Error body returned by the backend (kybes-compatible: `code`, `message`, `correlationId`). */
export const ApiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  correlationId: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export type FieldErrors = Record<string, string[]>;

/**
 * The only error type components see for HTTP failures: they never read axios' `error.response`.
 * `status` is 0 for network errors and timeouts.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId: string | undefined;
  readonly fieldErrors: FieldErrors | undefined;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    correlationId?: string | undefined;
    fieldErrors?: FieldErrors | undefined;
    cause?: unknown;
  }) {
    super(init.message, { cause: init.cause });
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.correlationId = init.correlationId;
    this.fieldErrors = init.fieldErrors;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
