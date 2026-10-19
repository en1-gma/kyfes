<script lang="ts">
	import { BarChart } from '$lib/shared/charts';
	import { m, formatCurrency } from '$lib/shared/i18n';
	import { QueryState } from '$lib/shared/ui';
	import { toMonthlyTotals, useOrderStats } from '../api/orders.queries';

	const stats = useOrderStats();
	// $derived, not `select`: the month labels follow a language switch.
	const points = $derived(stats.data ? toMonthlyTotals(stats.data) : []);
</script>

<section aria-labelledby="orders-chart-title">
	<h2 id="orders-chart-title">{m.orders_chart_title()}</h2>
	<QueryState query={stats} isEmpty={points.length === 0}>
		<BarChart
			title={m.orders_chart_title()}
			description={m.orders_chart_description()}
			seriesName={m.orders_chart_series()}
			categoryName={m.orders_chart_month()}
			data={points}
			formatValue={(value) => formatCurrency(value)}
		/>
	</QueryState>
</section>
