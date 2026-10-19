import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@shared/i18n';
import { ButtonComponent } from './button.component';

/** I campi di un risultato di `injectInfiniteQuery` usati dal piede della lista. */
export interface LoadMoreSource {
  hasNextPage: () => boolean;
  isFetchingNextPage: () => boolean;
  fetchNextPage: () => Promise<unknown>;
}

/** Piede di una lista a cursore: contatore annunciato (`aria-live`) + "carica altri" finché c'è `nextCursor`. */
@Component({
  selector: 'app-load-more',
  imports: [TranslocoPipe, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="state__meta" aria-live="polite">{{ summary() }}</p>
    @if (query().hasNextPage()) {
      <button appButton type="button" [disabled]="query().isFetchingNextPage()" (click)="loadMore()">
        {{ label() ?? ('common.actions.loadMore' | transloco) }}
      </button>
    }
  `,
})
export class LoadMoreComponent {
  readonly query = input.required<LoadMoreSource>();
  /** Testo già tradotto "N elementi caricati", annunciato agli screen reader. */
  readonly summary = input.required<string>();
  /** Etichetta già tradotta del pulsante (default `common.actions.loadMore`). */
  readonly label = input<string>();

  protected loadMore(): void {
    void this.query().fetchNextPage();
  }
}
