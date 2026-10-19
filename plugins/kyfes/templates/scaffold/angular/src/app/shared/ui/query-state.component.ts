import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, contentChild, input } from '@angular/core';
import { EmptyStateComponent } from './empty-state.component';
import { ErrorStateComponent } from './error-state.component';
import { SpinnerComponent } from './spinner.component';

/** I campi (signal) di un risultato di `injectQuery`/`injectInfiniteQuery` usati per scegliere lo stato. */
export interface QueryStateSource {
  isPending: () => boolean;
  error: () => unknown;
  refetch: () => Promise<unknown>;
}

/**
 * Caricamento → errore (con riprova) → vuoto → contenuto: la stessa sequenza per ogni query.
 * Il contenuto è un `<ng-template>` figlio, istanziato solo quando i dati ci sono.
 */
@Component({
  selector: 'app-query-state',
  imports: [NgTemplateOutlet, EmptyStateComponent, ErrorStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (query().isPending()) {
      <app-spinner />
    } @else if (query().error()) {
      <app-error-state [error]="query().error()" [retryable]="true" (retry)="retry()" />
    } @else if (empty()) {
      <app-empty-state [message]="emptyMessage()" />
    } @else {
      <ng-container [ngTemplateOutlet]="content()" />
    }
  `,
})
export class QueryStateComponent {
  readonly query = input.required<QueryStateSource>();
  readonly empty = input(false);
  /** Testo già tradotto per lo stato vuoto (default `common.states.empty`). */
  readonly emptyMessage = input<string>();

  protected readonly content = contentChild.required(TemplateRef);

  protected retry(): void {
    void this.query().refetch();
  }
}
