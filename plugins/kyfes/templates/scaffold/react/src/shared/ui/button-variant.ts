/** Visual variants of `<Button>` (CSS modifier `btn--<variant>`). */
export const BUTTON_VARIANT = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  ghost: 'ghost',
} as const;
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
