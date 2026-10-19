/**
 * Keys of the `common` namespace (`validation.*`) used as Zod error messages: forms translate them,
 * so every schema names a message through these constants.
 */
export const VALIDATION_KEYS = {
  required: 'validation.required',
  maxLength: 'validation.maxLength',
  invalid: 'validation.invalid',
  nonNegative: 'validation.nonNegative',
} as const;
