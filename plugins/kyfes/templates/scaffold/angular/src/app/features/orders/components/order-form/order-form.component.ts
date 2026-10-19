import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { isApiError } from '@shared/api';
import { TranslocoPipe } from '@shared/i18n';
import { zodValidator } from '@shared/lib';
import { injectCan } from '@shared/rbac';
import { ButtonComponent, ErrorStateComponent, ForbiddenStateComponent, SpinnerComponent } from '@shared/ui';
import { injectCreateOrder, injectUpdateOrder } from '../../api/orders.mutations';
import { injectOrder } from '../../api/orders.queries';
import {
  ORDER_INPUT_FIELDS,
  ORDER_STATUSES,
  type Order,
  type OrderInput,
  type OrderInputField,
  OrderInputSchema,
  type OrderPatch,
  type OrderStatus,
} from '../../model/orders.schema';
import { ORDER_SUBJECT, orderSubject } from '../../permissions';

type WritableFields = Record<OrderInputField, boolean>;

/** I messaggi di campo del backend sono chiavi i18n della feature; gli altri diventano generici. */
const SERVER_FIELD_ERROR_PREFIX = 'orders.form.errors.';
const GENERIC_FIELD_ERROR = 'common.validation.invalid';

function isOrderInputField(field: string): field is OrderInputField {
  return (ORDER_INPUT_FIELDS as readonly string[]).includes(field);
}

/** Solo i campi che l'utente può scrivere: gli altri non vengono MAI inviati. */
function pickWritable(input: OrderInput, writable: WritableFields): OrderPatch {
  const body: OrderPatch = {};
  if (writable.customerName) body.customerName = input.customerName;
  if (writable.total) body.total = input.total;
  if (writable.status) body.status = input.status;
  return body;
}

/**
 * Crea (senza `orderId`) o modifica un ordine. Validazione con lo schema Zod della feature,
 * permessi per campo CASL (create sul tipo, update sul record) e controllo sul record in modifica.
 */
@Component({
  selector: 'app-order-form',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    ButtonComponent,
    ErrorStateComponent,
    ForbiddenStateComponent,
    SpinnerComponent,
  ],
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
  /** Modifica: `update` sul record caricato (condizioni CASL), non solo sul tipo come la rotta. */
  protected readonly canUpdateRecord = computed(() => {
    const order = this.order.data();
    return order ? this.can('update', orderSubject(order)) : true;
  });
  /** Permessi per campo: in creazione sul tipo, in modifica sul record. */
  protected readonly writable = computed<WritableFields>(() => {
    const order = this.order.data();
    const allowed = (field: OrderInputField) =>
      order ? this.can('update', orderSubject(order), field) : this.can('create', ORDER_SUBJECT, field);
    return { customerName: allowed('customerName'), total: allowed('total'), status: allowed('status') };
  });
  protected readonly saving = computed(() => this.createOrder.isPending() || this.updateOrder.isPending());
  /** Errore di salvataggio da mostrare in alto: assente se tutti i fieldErrors sono finiti sui campi. */
  protected readonly saveError = signal<unknown>(null);

  /** Id dell'ordine già copiato nel form: un refetch in background non sovrascrive le modifiche. */
  private loadedId: string | null = null;

  constructor() {
    effect(() => {
      const order = this.order.data();
      if (!order || order.id === this.loadedId || this.form.dirty) return;
      this.loadedId = order.id;
      this.form.reset({ customerName: order.customerName, total: order.total, status: order.status });
    });
    effect(() => {
      const writable = this.writable();
      for (const field of ORDER_INPUT_FIELDS) {
        const control = this.form.controls[field];
        if (writable[field]) control.enable({ emitEvent: false });
        else control.disable({ emitEvent: false });
      }
    });
  }

  protected errorKey(control: OrderInputField): string | null {
    const c = this.form.controls[control];
    const key: unknown = c.errors?.['server'] ?? c.errors?.['zod'];
    return c.touched && typeof key === 'string' ? key : null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const parsed = OrderInputSchema.safeParse(this.form.getRawValue());
    if (!parsed.success) return;
    const body = pickWritable(parsed.data, this.writable());
    const id = this.orderId();
    const callbacks = {
      onSuccess: (order: Order) => this.saved.emit(order),
      onError: (error: unknown) => this.showServerErrors(error),
    };
    this.saveError.set(null);
    if (id) this.updateOrder.mutate({ id, input: body }, callbacks);
    else this.createOrder.mutate(body, callbacks);
  }

  /** `ApiError.fieldErrors` → errori sui controlli; messaggio generico solo per ciò che resta. */
  private showServerErrors(error: unknown): void {
    const fieldErrors = isApiError(error) ? error.fieldErrors : null;
    const entries = Object.entries(fieldErrors ?? {});
    const unmatched = entries.filter(
      ([field]) => !isOrderInputField(field) || this.form.controls[field].disabled,
    );
    for (const [field, messages] of entries) {
      if (!isOrderInputField(field)) continue;
      const control = this.form.controls[field];
      if (control.disabled) continue;
      const message = messages[0] ?? '';
      control.setErrors({
        server: message.startsWith(SERVER_FIELD_ERROR_PREFIX) ? message : GENERIC_FIELD_ERROR,
      });
      control.markAsTouched();
    }
    this.saveError.set(entries.length === 0 || unmatched.length > 0 ? error : null);
  }
}
