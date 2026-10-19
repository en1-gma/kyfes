import { ACTION, SUBJECT, subject, type AppAbility } from '@/shared/rbac';
import {
  ORDER_FIELD,
  ORDER_FIELDS,
  type Order,
  type OrderField,
  type OrderWrite,
} from './model/orders.schema';

/** CASL subject of the orders feature (registered in shared/rbac SUBJECT). */
export const ORDER_SUBJECT = SUBJECT.Order;

/** Tags a record so that conditions (e.g. `{ status: 'draft' }`) are evaluated on it. */
export function orderSubject(order: Order) {
  return subject(ORDER_SUBJECT, { ...order });
}

export function canEditOrder(ability: AppAbility, order: Order): boolean {
  return ability.can(ACTION.update, orderSubject(order));
}

export function canDeleteOrder(ability: AppAbility, order: Order): boolean {
  return ability.can(ACTION.delete, orderSubject(order));
}

export function canEditOrderStatus(ability: AppAbility, order: Order): boolean {
  return ability.can(ACTION.update, orderSubject(order), ORDER_FIELD.status);
}

/** Fields the user may write: `create` on the type for a new order, `update` on the record otherwise. */
export function writableOrderFields(ability: AppAbility, order?: Order): ReadonlySet<OrderField> {
  return new Set(
    ORDER_FIELDS.filter((field) =>
      order
        ? ability.can(ACTION.update, orderSubject(order), field)
        : ability.can(ACTION.create, ORDER_SUBJECT, field),
    ),
  );
}

/** Drops every field the user cannot write: it is never sent, the server keeps or defaults it. */
export function pickWritable(values: OrderWrite, writable: ReadonlySet<OrderField>): OrderWrite {
  return Object.fromEntries(
    Object.entries(values).filter(([field]) => writable.has(field as OrderField)),
  ) as OrderWrite;
}
