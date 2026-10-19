import { BUTTON_VARIANT } from '$lib/shared/config/constants';

/** Visual variants of the shared Button (defined in shared/config/constants.ts). */
export { BUTTON_VARIANT };
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
