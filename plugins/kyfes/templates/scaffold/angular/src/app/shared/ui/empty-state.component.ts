import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@shared/i18n';

@Component({
  selector: 'app-empty-state',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state state--empty">
      <p>{{ message() ?? ('common.states.empty' | transloco) }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  /** Testo già tradotto. */
  readonly message = input<string>();
}
