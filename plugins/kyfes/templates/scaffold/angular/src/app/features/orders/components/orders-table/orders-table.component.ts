import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleCurrencyPipe, LocaleDatePipe, TranslocoPipe } from '@shared/i18n';
import { injectCan } from '@shared/rbac';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  SpinnerComponent,
} from '@shared/ui';
import { injectDeleteOrder } from '../../api/orders.mutations';
import { injectOrdersList } from '../../api/orders.queries';
import type { Order } from '../../model/orders.schema';
import { ORDER_SUBJECT, orderSubject } from '../../permissions';

@Component({
  selector: 'app-orders-table',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocaleDatePipe,
    LocaleCurrencyPipe,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SpinnerComponent,
  ],
  templateUrl: './orders-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersTableComponent {
  protected readonly orders = injectOrdersList();
  protected readonly deleteOrder = injectDeleteOrder();
  protected readonly can = injectCan();
  protected readonly orderSubject = orderSubject;

  protected readonly rows = computed(() => this.orders.data()?.pages.flatMap((page) => page.items) ?? []);
  /** La colonna azioni esiste solo se l'utente può modificare o eliminare almeno un ordine. */
  protected readonly showActions = computed(
    () => this.can('update', ORDER_SUBJECT) || this.can('delete', ORDER_SUBJECT),
  );
  protected readonly pendingDelete = signal<Order | null>(null);

  protected confirmDelete(): void {
    const order = this.pendingDelete();
    if (order) this.deleteOrder.mutate(order.id);
    this.pendingDelete.set(null);
  }
}
