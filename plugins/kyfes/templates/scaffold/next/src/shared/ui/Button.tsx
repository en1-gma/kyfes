import type { ButtonHTMLAttributes } from 'react';
import { BUTTON_VARIANT } from '@/shared/config/constants';
import styles from './ui.module.css';

export { BUTTON_VARIANT };
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function buttonClassName(variant: ButtonVariant = BUTTON_VARIANT.default): string {
  return [styles.button, variant !== BUTTON_VARIANT.default ? styles[variant] : undefined]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = BUTTON_VARIANT.default,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const classes = [buttonClassName(variant), className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
