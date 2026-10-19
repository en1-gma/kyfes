import type { ButtonHTMLAttributes } from 'react';
import styles from './ui.module.css';

export type ButtonVariant = 'default' | 'primary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function buttonClassName(variant: ButtonVariant = 'default'): string {
  return [styles.button, variant !== 'default' ? styles[variant] : undefined]
    .filter(Boolean)
    .join(' ');
}

export function Button({ variant = 'default', type = 'button', className, ...rest }: ButtonProps) {
  const classes = [buttonClassName(variant), className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
