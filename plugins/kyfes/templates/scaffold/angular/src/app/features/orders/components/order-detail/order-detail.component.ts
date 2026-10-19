import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleCurrencyPipe, LocaleDatePipe, TranslocoPipe } from '@shared/i18n';
import { Action, injectCan } from '@shared/rbac';
import { ButtonComponent, QueryStateComponent } from '@shared/ui';
import { injectOrder } from '../../api/orders.queries';
import { orderSubject } from '../../permissions';
import { orderPaths } from '../../routes';

@Component({
  selector: 'app-order-detail',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocaleDatePipe,
    LocaleCurrencyPipe,
    ButtonComponent,
    QueryStateComponent,
  ],
  templateUrl: './order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent {
  readonly orderId = input.required<string>();
  protected readonly order = injectOrder(() => this.orderId());
  protected readonly can = injectCan();
  protected readonly orderSubject = orderSubject;
  protected readonly Action = Action;
  protected readonly paths = orderPaths;
}
