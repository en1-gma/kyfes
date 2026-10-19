import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { type Order, OrderFormComponent } from '@features/orders';
import { TranslocoPipe } from '@shared/i18n';

@Component({
  selector: 'app-order-edit-page',
  imports: [RouterLink, TranslocoPipe, OrderFormComponent],
  templateUrl: './order-edit-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderEditPageComponent {
  private readonly router = inject(Router);
  readonly id = input.required<string>();

  protected onSaved(order: Order): void {
    void this.router.navigate(['/orders', order.id]);
  }
}
