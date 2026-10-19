import { z } from 'zod';

/** Error body of the backend (same contract as kybes). */
export const ApiErrorBodySchema = z.object({
	code: z.string(),
	message: z.string(),
	correlationId: z.string().optional(),
	fieldErrors: z.record(z.string(), z.array(z.string())).optional()
});

export type FieldErrors = Record<string, string[]>;

/** The only error type the UI sees: components never read axios' `error.response`. */
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
	}) {
		super(init.message);
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

	/** Network errors (status 0) and 5xx are worth a retry; 4xx are not. */
	get isRetryable(): boolean {
		return this.status === 0 || this.status >= 500;
	}
}

export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError;
}
