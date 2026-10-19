import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export const BUTTON_VARIANT = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  ghost: 'ghost',
} as const;
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

/** `<button appButton variant="primary">` / `<a appButton routerLink="…">`: solo stile, nessuna logica. */
@Component({
  selector: 'button[appButton], a[appButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'btn',
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--secondary]': "variant() === 'secondary'",
    '[class.btn--danger]': "variant() === 'danger'",
    '[class.btn--ghost]': "variant() === 'ghost'",
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>(BUTTON_VARIANT.secondary);
}
