import { subject, type AppAbility, type SubjectName } from '@/shared/rbac';
import { ORDER_FIELDS, type Order, type OrderField, type OrderWrite } from './model/orders.schema';

/** CASL subject of the orders feature (registered in shared/rbac SUBJECTS). */
export const ORDER_SUBJECT = 'Order' as const satisfies SubjectName;

/** Tags a record so that conditions (e.g. `{ status: 'draft' }`) are evaluated on it. */
export function orderSubject(order: Order) {
  return subject(ORDER_SUBJECT, { ...order });
}

export function canEditOrder(ability: AppAbility, order: Order): boolean {
  return ability.can('update', orderSubject(order));
}

export function canDeleteOrder(ability: AppAbility, order: Order): boolean {
  return ability.can('delete', orderSubject(order));
}

export function canEditOrderStatus(ability: AppAbility, order: Order): boolean {
  return ability.can('update', orderSubject(order), 'status');
}

/** Fields the user may write: `create` on the type for a new order, `update` on the record otherwise. */
export function writableOrderFields(ability: AppAbility, order?: Order): ReadonlySet<OrderField> {
  return new Set(
    ORDER_FIELDS.filter((field) =>
      order
        ? ability.can('update', orderSubject(order), field)
        : ability.can('create', ORDER_SUBJECT, field),
    ),
  );
}

/** Drops every field the user cannot write: it is never sent, the server keeps or defaults it. */
export function pickWritable(values: OrderWrite, writable: ReadonlySet<OrderField>): OrderWrite {
  return Object.fromEntries(
    Object.entries(values).filter(([field]) => writable.has(field as OrderField)),
  ) as OrderWrite;
}
