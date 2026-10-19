'use client';

import { BarChart } from '@/shared/charts';
import { useFormatters, useTranslations } from '@/shared/i18n';
import { QueryState } from '@/shared/ui';
import { useOrderStats } from '../api/orders.queries';

/** Monthly order totals (data shaped in api/, rendering via shared/charts). */
export function OrdersChart() {
  const t = useTranslations('orders');
  const { formatCurrency, formatDate } = useFormatters();
  const query = useOrderStats();
  const data = query.data ?? [];

  return (
    <QueryState query={query} isEmpty={data.length === 0}>
      <BarChart
        title={t('chart.title')}
        summary={t('chart.summary', { count: data.length })}
        data={data}
        xKey="month"
        series={[{ key: 'total', label: t('chart.series') }]}
        formatX={(month) =>
          formatDate(`${month}-01T00:00:00Z`, { month: 'short', year: 'numeric' })
        }
        formatValue={(v) => formatCurrency(v)}
      />
    </QueryState>
  );
}
