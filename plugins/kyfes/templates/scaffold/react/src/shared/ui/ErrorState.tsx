import { isApiError } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { Button } from './Button';
import { ForbiddenState } from './ForbiddenState';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/**
 * Generic message + correlationId (kyfes §3.4/§4.3): the backend message is never shown raw,
 * it may contain internal details. 403 shows the "not authorized" state.
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  if (isApiError(error) && error.isForbidden) return <ForbiddenState />;
  const network = isApiError(error) && error.status === 0;
  const correlationId = isApiError(error) ? error.correlationId : undefined;
  return (
    <div className="state state--error" role="alert">
      <h2 className="state__title">{t('state.errorTitle')}</h2>
      <p>{network ? t('state.networkError') : t('state.errorMessage')}</p>
      {correlationId && <p className="state__meta">{t('state.correlationId', { id: correlationId })}</p>}
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      )}
    </div>
  );
}
