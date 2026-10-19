import { useMemo } from 'react';
import { BarChart } from '@/shared/charts';
import { formatCurrency, formatMonth, useTranslation } from '@/shared/i18n';
import { EmptyState, ErrorState, Spinner } from '@/shared/ui';
import { useOrderStats } from '../api/orders.queries';

/** Order totals per month (data aggregated by the backend, `/orders/stats`). */
export function OrdersChart() {
  const { t, i18n } = useTranslation('orders');
  const { data, error, isPending, refetch } = useOrderStats();
  const locale = i18n.resolvedLanguage;

  const points = useMemo(
    () => (data?.months ?? []).map((m) => ({ label: formatMonth(m.month, locale), value: m.total })),
    [data, locale],
  );

  if (isPending) return <Spinner />;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }
  if (points.length === 0) return <EmptyState />;

  return (
    <BarChart
      title={t('chart.title')}
      description={t('chart.description', { count: points.length })}
      seriesLabel={t('chart.series')}
      data={points}
      formatValue={(v) => formatCurrency(v, 'EUR', { maximumFractionDigits: 0 })}
    />
  );
}
