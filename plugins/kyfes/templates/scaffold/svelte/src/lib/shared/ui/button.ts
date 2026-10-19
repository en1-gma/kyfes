/** Visual variants of the shared Button (classes `.btn-<variant>`). */
export const BUTTON_VARIANT = {
	primary: 'primary',
	secondary: 'secondary',
	danger: 'danger'
} as const;
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
