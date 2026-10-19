import type { ButtonHTMLAttributes } from 'react';
import { BUTTON_VARIANT, type ButtonVariant } from './button-variant';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  busy?: boolean;
}

export function Button({
  variant = BUTTON_VARIANT.secondary,
  busy = false,
  className,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled ?? busy}
      aria-busy={busy || undefined}
      className={['btn', `btn--${variant}`, className].filter(Boolean).join(' ')}
    />
  );
}
