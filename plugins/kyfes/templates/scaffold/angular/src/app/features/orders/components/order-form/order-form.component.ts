import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@shared/i18n';
import { zodValidator } from '@shared/lib';
import { injectCan } from '@shared/rbac';
import { ButtonComponent, ErrorStateComponent, SpinnerComponent } from '@shared/ui';
import { injectCreateOrder, injectUpdateOrder } from '../../api/orders.mutations';
import { injectOrder } from '../../api/orders.queries';
import { ORDER_STATUSES, type Order, OrderInputSchema, type OrderStatus } from '../../model/orders.schema';
import { ORDER_SUBJECT, orderSubject } from '../../permissions';

/** Crea (senza `orderId`) o modifica un ordine. Validazione con lo schema Zod della feature. */
@Component({
  selector: 'app-order-form',
  imports: [ReactiveFormsModule, TranslocoPipe, ButtonComponent, ErrorStateComponent, SpinnerComponent],
  templateUrl: './order-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderFormComponent {
  readonly orderId = input<string>();
  readonly saved = output<Order>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly can = injectCan();
  protected readonly order = injectOrder(() => this.orderId());
  protected readonly createOrder = injectCreateOrder();
  protected readonly updateOrder = injectUpdateOrder();
  protected readonly statuses = ORDER_STATUSES;

  protected readonly form = this.fb.group({
    customerName: ['', zodValidator(OrderInputSchema.shape.customerName)],
    total: [0 as number | null, zodValidator(OrderInputSchema.shape.total)],
    status: ['draft' as OrderStatus, zodValidator(OrderInputSchema.shape.status)],
  });

  protected readonly isEdit = computed(() => !!this.orderId());
  /** Permesso per campo: senza `update` su `status` il campo è in sola lettura. */
  protected readonly canEditStatus = computed(() => {
    const order = this.order.data();
    return order
      ? this.can('update', orderSubject(order), 'status')
      : this.can('create', ORDER_SUBJECT, 'status');
  });
  protected readonly saving = computed(() => this.createOrder.isPending() || this.updateOrder.isPending());
  protected readonly saveError = computed(() => this.createOrder.error() ?? this.updateOrder.error());

  constructor() {
    effect(() => {
      const order = this.order.data();
      if (order) {
        this.form.reset({ customerName: order.customerName, total: order.total, status: order.status });
      }
    });
    effect(() => {
      const status = this.form.controls.status;
      if (this.canEditStatus()) status.enable({ emitEvent: false });
      else status.disable({ emitEvent: false });
    });
  }

  protected errorKey(control: 'customerName' | 'total' | 'status'): string | null {
    const c = this.form.controls[control];
    const key: unknown = c.errors?.['zod'];
    return c.touched && typeof key === 'string' ? key : null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const parsed = OrderInputSchema.safeParse(this.form.getRawValue());
    if (!parsed.success) return;
    const id = this.orderId();
    const onSuccess = (order: Order) => this.saved.emit(order);
    if (id) this.updateOrder.mutate({ id, input: parsed.data }, { onSuccess });
    else this.createOrder.mutate(parsed.data, { onSuccess });
  }
}
