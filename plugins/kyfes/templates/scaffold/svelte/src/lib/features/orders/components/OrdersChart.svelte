<script lang="ts">
	import { BarChart } from '$lib/shared/charts';
	import { m, formatCurrency } from '$lib/shared/i18n';
	import { EmptyState, ErrorState, Spinner } from '$lib/shared/ui';
	import { useOrderStats } from '../api/orders.queries';

	const stats = useOrderStats();
</script>

<section aria-labelledby="orders-chart-title">
	<h2 id="orders-chart-title">{m.orders_chart_title()}</h2>
	{#if stats.isPending}
		<Spinner />
	{:else if stats.isError}
		<ErrorState error={stats.error} onretry={() => stats.refetch()} />
	{:else if stats.data.length === 0}
		<EmptyState />
	{:else}
		<BarChart
			title={m.orders_chart_title()}
			description={m.orders_chart_description()}
			seriesName={m.orders_chart_series()}
			categoryName={m.orders_chart_month()}
			data={stats.data}
			formatValue={(value) => formatCurrency(value)}
		/>
	{/if}
</section>
