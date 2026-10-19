'use client';

import type { ReactNode } from 'react';
import { ORDER_SUBJECT } from '@/features/orders';
import { RequirePermission } from '@/shared/rbac';

/** Type-level check (update Order); the record-level check is enforced by the server. */
export function OrderEditGuard({ children }: { children: ReactNode }) {
  return (
    <RequirePermission action="update" subject={ORDER_SUBJECT}>
      {children}
    </RequirePermission>
  );
}
