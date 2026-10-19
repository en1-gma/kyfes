import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersChartComponent, OrdersTableComponent } from '@features/orders';
import { TranslocoPipe } from '@shared/i18n';
import { CanDirective } from '@shared/rbac';
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
export class OrdersPageComponent {}
