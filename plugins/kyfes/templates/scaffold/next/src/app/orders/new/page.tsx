'use client';

import { NewOrder, ORDER_SUBJECT } from '@/features/orders';
import { RequirePermission } from '@/shared/rbac';

export default function NewOrderPage() {
  return (
    <RequirePermission action="create" subject={ORDER_SUBJECT}>
      <NewOrder />
    </RequirePermission>
  );
}
