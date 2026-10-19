import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderDetailComponent, orderPaths } from '@features/orders';
import { TranslocoPipe } from '@shared/i18n';

@Component({
  selector: 'app-order-detail-page',
  imports: [RouterLink, TranslocoPipe, OrderDetailComponent],
  templateUrl: './order-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPageComponent {
  protected readonly paths = orderPaths;
  /** Parametro di rotta `:id` (withComponentInputBinding). */
  readonly id = input.required<string>();
}
