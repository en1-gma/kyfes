import { z } from 'zod';

/** Error payload of the backend (kybes-compatible). */
export const ApiErrorBodySchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  correlationId: z.string().optional(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
});

export interface ApiErrorInit {
  status: number;
  code: string;
  message: string;
  correlationId?: string;
  fieldErrors?: Record<string, string>;
}

/** The only error shape components ever see (never axios' `error.response`). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.correlationId = init.correlationId;
    this.fieldErrors = init.fieldErrors;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** status 0 = network error / timeout. */
export function toApiError(status: number, body: unknown, headerCorrelationId?: string): ApiError {
  const parsed = ApiErrorBodySchema.safeParse(body);
  const data = parsed.success ? parsed.data : {};
  return new ApiError({
    status,
    code: data.code ?? (status === 0 ? 'NETWORK_ERROR' : `HTTP_${status}`),
    message: data.message ?? 'Request failed',
    correlationId: data.correlationId ?? headerCorrelationId,
    fieldErrors: data.fieldErrors,
  });
}
