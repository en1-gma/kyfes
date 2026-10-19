import { useMemo } from 'react';
import { BarChart } from '@/shared/charts';
import { DEFAULT_CURRENCY, formatCurrency, formatMonth, useTranslation } from '@/shared/i18n';
import { QueryState } from '@/shared/ui';
import { useOrderStats } from '../api/orders.queries';
import { ORDERS_NS } from '../model/orders.feature';

/** Order totals per month (data aggregated by the backend, `/orders/stats`). */
export function OrdersChart() {
  const { t, i18n } = useTranslation(ORDERS_NS);
  const query = useOrderStats();
  const { data } = query;
  const locale = i18n.resolvedLanguage;

  const points = useMemo(
    () => (data?.months ?? []).map((m) => ({ label: formatMonth(m.month, locale), value: m.total })),
    [data, locale],
  );

  return (
    <QueryState query={query} isEmpty={points.length === 0}>
      <BarChart
        title={t('chart.title')}
        description={t('chart.description', { count: points.length })}
        seriesLabel={t('chart.series')}
        data={points}
        formatValue={(v) => formatCurrency(v, DEFAULT_CURRENCY, { maximumFractionDigits: 0 })}
      />
    </QueryState>
  );
}
