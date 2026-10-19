'use client';

import { BarChart } from '@/shared/charts';
import { useFormatters, useTranslations } from '@/shared/i18n';
import { EmptyState, ErrorState, Loading } from '@/shared/ui';
import { useOrderStats } from '../api/orders.queries';

/** Monthly order totals (data shaped in api/, rendering via shared/charts). */
export function OrdersChart() {
  const t = useTranslations('orders');
  const { formatCurrency, formatDate } = useFormatters();
  const { data, isPending, isError, error, refetch } = useOrderStats();

  if (isPending) return <Loading />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.length === 0) return <EmptyState />;

  return (
    <BarChart
      title={t('chart.title')}
      summary={t('chart.summary', { count: data.length })}
      data={data}
      xKey="month"
      series={[{ key: 'total', label: t('chart.series') }]}
      formatX={(month) => formatDate(`${month}-01T00:00:00Z`, { month: 'short', year: 'numeric' })}
      formatValue={(v) => formatCurrency(v)}
    />
  );
}
