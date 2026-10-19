import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { type Order, OrderFormComponent } from '@features/orders';
import { TranslocoPipe } from '@shared/i18n';

@Component({
  selector: 'app-new-order-page',
  imports: [RouterLink, TranslocoPipe, OrderFormComponent],
  templateUrl: './new-order-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewOrderPageComponent {
  private readonly router = inject(Router);

  protected onSaved(order: Order): void {
    void this.router.navigate(['/orders', order.id]);
  }
}
