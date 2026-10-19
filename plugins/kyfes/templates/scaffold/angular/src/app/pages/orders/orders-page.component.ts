import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ORDER_SUBJECT, OrdersChartComponent, OrdersTableComponent, orderPaths } from '@features/orders';
import { TranslocoPipe } from '@shared/i18n';
import { Action, CanDirective } from '@shared/rbac';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-orders-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    CanDirective,
    ButtonComponent,
    OrdersTableComponent,
    OrdersChartComponent,
  ],
  templateUrl: './orders-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPageComponent {
  protected readonly Action = Action;
  protected readonly orderSubject = ORDER_SUBJECT;
  protected readonly paths = orderPaths;
}
