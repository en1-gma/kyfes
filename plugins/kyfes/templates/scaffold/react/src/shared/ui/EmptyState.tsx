import type { ReactNode } from 'react';
import { useTranslation } from '@/shared/i18n';

export function EmptyState({ message, action }: { message?: string; action?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="state state--empty">
      <p>{message ?? t('state.empty')}</p>
      {action}
    </div>
  );
}
