import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { ForbiddenState } from '@/shared/ui';
import type { Actions } from '@/shared/config/constants';
import type { Subjects } from './ability';
import { useAbility } from './can';

interface RequirePermissionProps {
  action: Actions;
  subject: Subjects;
  children?: ReactNode;
  /** Shown when the permission is missing: a 403 page, never a silent redirect (kyfes §5). */
  fallback?: ReactNode;
}

export function RequirePermission({ action, subject, children, fallback }: RequirePermissionProps) {
  const ability = useAbility();
  if (ability.cannot(action, subject)) return fallback ?? <ForbiddenState />;
  return children ?? <Outlet />;
}
