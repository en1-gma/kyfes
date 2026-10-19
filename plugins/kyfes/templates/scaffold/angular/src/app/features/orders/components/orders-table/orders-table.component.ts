import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleCurrencyPipe, LocaleDatePipe, TranslocoPipe } from '@shared/i18n';
import { Action, injectCan } from '@shared/rbac';
import {
  ButtonComponent,
  ConfirmDeleteDialogComponent,
  ErrorStateComponent,
  LoadMoreComponent,
  QueryStateComponent,
} from '@shared/ui';
import { injectDeleteOrder } from '../../api/orders.mutations';
import { injectOrdersList } from '../../api/orders.queries';
import type { Order } from '../../model/orders.schema';
import { ORDER_SUBJECT } from '../../constants';
import { orderSubject } from '../../permissions';
import { orderPaths } from '../../routes';

@Component({
  selector: 'app-orders-table',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocaleDatePipe,
    LocaleCurrencyPipe,
    ButtonComponent,
    ConfirmDeleteDialogComponent,
    ErrorStateComponent,
    LoadMoreComponent,
    QueryStateComponent,
  ],
  templateUrl: './orders-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersTableComponent {
  protected readonly orders = injectOrdersList();
  protected readonly deleteOrder = injectDeleteOrder();
  protected readonly can = injectCan();
  protected readonly orderSubject = orderSubject;
  protected readonly Action = Action;
  protected readonly paths = orderPaths;

  protected readonly rows = computed(() => this.orders.data()?.pages.flatMap((page) => page.items) ?? []);
  /** La colonna azioni esiste solo se l'utente può modificare o eliminare almeno un ordine. */
  protected readonly showActions = computed(
    () => this.can(Action.Update, ORDER_SUBJECT) || this.can(Action.Delete, ORDER_SUBJECT),
  );
  protected readonly pendingDelete = signal<Order | null>(null);
}
