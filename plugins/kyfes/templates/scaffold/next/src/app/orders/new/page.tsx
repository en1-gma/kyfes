'use client';

import { NewOrder, ORDER_SUBJECT } from '@/features/orders';
import { ACTION, RequirePermission } from '@/shared/rbac';

export default function NewOrderPage() {
  return (
    <RequirePermission action={ACTION.create} subject={ORDER_SUBJECT}>
      <NewOrder />
    </RequirePermission>
  );
}
