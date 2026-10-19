import { z } from 'zod'

/** Error body returned by the backend (kybes-compatible). */
export const ApiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  correlationId: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})

export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>

/** The only error type components ever see: never read axios' `error.response`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId: string | undefined
  readonly fieldErrors: Record<string, string[]> | undefined

  constructor(init: {
    status: number
    code: string
    message: string
    correlationId?: string | undefined
    fieldErrors?: Record<string, string[]> | undefined
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.correlationId = init.correlationId
    this.fieldErrors = init.fieldErrors
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  get isServerError(): boolean {
    return this.status >= 500 || this.status === 0
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const NETWORK_STATUS = 0

/** Builds an ApiError from a status and an arbitrary (untrusted) body. */
export function toApiError(status: number, body: unknown, headerCorrelationId?: string): ApiError {
  const parsed = ApiErrorBodySchema.safeParse(body)
  if (parsed.success) {
    return new ApiError({
      status,
      ...parsed.data,
      correlationId: parsed.data.correlationId ?? headerCorrelationId,
    })
  }
  return new ApiError({
    status,
    code: status === NETWORK_STATUS ? 'NETWORK_ERROR' : `HTTP_${status}`,
    message: status === NETWORK_STATUS ? 'Network error' : 'Unexpected error',
    correlationId: headerCorrelationId,
  })
}
