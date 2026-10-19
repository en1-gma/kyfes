import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@shared/i18n';

@Component({
  selector: 'app-spinner',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner" role="status" aria-live="polite">
      <span class="spinner__circle" aria-hidden="true"></span>
      <span class="visually-hidden">{{ label() ?? ('common.states.loading' | transloco) }}</span>
    </div>
  `,
})
export class SpinnerComponent {
  /** Testo già tradotto; default `common.states.loading`. */
  readonly label = input<string>();
}
