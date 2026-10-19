import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { isApiError } from '@shared/api';
import { TranslocoPipe } from '@shared/i18n';

/** Messaggio generico (mai il dettaglio tecnico) + correlationId per il supporto. */
@Component({
  selector: 'app-error-state',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state state--error" role="alert">
      <p>{{ messageKey() | transloco }}</p>
      @if (correlationId(); as id) {
        <p class="state__meta">{{ 'common.errors.correlationId' | transloco: { id } }}</p>
      }
      @if (retryable()) {
        <button type="button" class="btn btn--secondary" (click)="retry.emit()">
          {{ 'common.actions.retry' | transloco }}
        </button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  readonly error = input<unknown>(null);
  readonly retryable = input(false);
  readonly retry = output<void>();

  protected readonly messageKey = computed(() => {
    const error = this.error();
    if (!isApiError(error)) return 'common.errors.generic';
    if (error.code === 'NETWORK_ERROR') return 'common.errors.network';
    if (error.status === 403) return 'common.errors.forbidden';
    if (error.status === 404) return 'common.errors.notFound';
    return 'common.errors.generic';
  });

  protected readonly correlationId = computed(() => {
    const error = this.error();
    return isApiError(error) ? error.correlationId : null;
  });
}
