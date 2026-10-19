import { useTranslation } from '@/shared/i18n';
import { ForbiddenState } from '@/shared/ui';

export default function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <div className="page">
      <title>{t('forbidden.title')}</title>
      <ForbiddenState />
    </div>
  );
}
