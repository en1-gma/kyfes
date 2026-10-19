import { useTranslation } from '@/shared/i18n';

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__circle" aria-hidden="true" />
      <span className="spinner__label">{label ?? t('state.loading')}</span>
    </div>
  );
}
