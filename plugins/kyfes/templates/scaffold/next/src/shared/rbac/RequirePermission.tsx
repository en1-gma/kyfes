'use client';

import type { ReactNode } from 'react';
import { ForbiddenPage } from '@/shared/ui';
import { useAbility } from './AbilityProvider';
import type { Actions, Subjects } from './ability';

/** Route guard: without the permission shows the 403 page (never a silent redirect). */
export function RequirePermission({
  action,
  subject,
  children,
}: {
  action: Actions;
  subject: Subjects;
  children: ReactNode;
}) {
  const ability = useAbility();
  if (!ability.can(action, subject)) return <ForbiddenPage />;
  return <>{children}</>;
}
