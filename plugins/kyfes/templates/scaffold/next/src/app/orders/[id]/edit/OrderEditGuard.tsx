'use client';

import type { ReactNode } from 'react';
import { ORDER_SUBJECT } from '@/features/orders';
import { RequirePermission } from '@/shared/rbac';

/**
 * Type-level check (update Order). The record-level check (`canEditOrder`, e.g. drafts only)
 * runs in EditOrder once the order is loaded; the server enforces both anyway.
 */
export function OrderEditGuard({ children }: { children: ReactNode }) {
  return (
    <RequirePermission action="update" subject={ORDER_SUBJECT}>
      {children}
    </RequirePermission>
  );
}
