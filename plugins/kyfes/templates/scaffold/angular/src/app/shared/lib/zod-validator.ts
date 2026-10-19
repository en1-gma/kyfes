import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type * as z from 'zod';

const I18N_KEY = /^[a-z][\w-]*\.[\w.-]+$/;

/** Chiave i18n dell'errore di campo generico (messaggio non traducibile o non riconosciuto). */
export const GENERIC_FIELD_ERROR = 'common.validation.invalid';

/**
 * Validator di Reactive Forms basato su uno schema Zod.
 * Gli schemi usano come messaggio una chiave i18n (`{ error: 'orders.form.errors.x' }`):
 * l'errore restituito è `{ zod: '<chiave>' }`, tradotto nel template.
 */
export function zodValidator(schema: z.ZodType): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = schema.safeParse(control.value);
    if (result.success) return null;
    const message = result.error.issues[0]?.message ?? '';
    return { zod: I18N_KEY.test(message) ? message : GENERIC_FIELD_ERROR };
  };
}
