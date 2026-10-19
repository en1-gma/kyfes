'use client';

import type { ReactNode } from 'react';
import { ORDER_SUBJECT } from '@/features/orders';
import { RequireAuth } from '@/shared/auth';
import { RequirePermission } from '@/shared/rbac';

export function OrdersGuard({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequirePermission action="read" subject={ORDER_SUBJECT}>
        {children}
      </RequirePermission>
    </RequireAuth>
  );
}
