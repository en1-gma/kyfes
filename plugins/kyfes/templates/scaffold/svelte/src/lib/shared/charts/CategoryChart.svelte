<script lang="ts">
	import { m } from '$lib/shared/i18n';
	import { loadECharts, type ChartInstance } from './echarts';
	import {
		buildCategoryOption,
		readTheme,
		type CategoryChartProps,
		type ChartKind
	} from './options';

	let {
		kind,
		title,
		description,
		seriesName,
		categoryName,
		data,
		formatValue,
		height = 280
	}: CategoryChartProps & { kind: ChartKind } = $props();

	let container: HTMLDivElement | undefined = $state();
	let chart: ChartInstance | undefined = $state();
	const format = $derived(formatValue ?? ((value: number) => String(value)));

	// Mount: lazy-load ECharts, then keep the instance in sync with the container size.
	$effect(() => {
		const element = container;
		if (!element) return;
		let disposed = false;
		let observer: ResizeObserver | undefined;
		loadECharts()
			.then((echarts) => {
				if (disposed) return;
				chart = echarts.init(element, undefined, { renderer: 'canvas' });
				if (typeof ResizeObserver !== 'undefined') {
					observer = new ResizeObserver(() => chart?.resize());
					observer.observe(element);
				}
			})
			.catch(() => {
				// No canvas (e.g. tests): the data table below stays the accessible fallback.
			});
		return () => {
			disposed = true;
			observer?.disconnect();
			chart?.dispose();
			chart = undefined;
		};
	});

	$effect(() => {
		if (!chart || !container) return;
		chart.setOption(
			buildCategoryOption(kind, { data, seriesName, formatValue }, readTheme(container)),
			{
				notMerge: true
			}
		);
	});
</script>

<figure class="chart">
	<div
		bind:this={container}
		class="canvas"
		role="img"
		aria-label={description ? `${title}. ${description}` : title}
		style:height="{height}px"
	></div>
	<figcaption>
		<details>
			<summary>{m.common_chart_data_table()}</summary>
			<table>
				<caption class="visually-hidden">{title}</caption>
				<thead>
					<tr><th scope="col">{categoryName}</th><th scope="col">{seriesName}</th></tr>
				</thead>
				<tbody>
					{#each data as datum (datum.label)}
						<tr><th scope="row">{datum.label}</th><td>{format(datum.value)}</td></tr>
					{/each}
				</tbody>
			</table>
		</details>
	</figcaption>
</figure>

<style>
	.chart {
		margin: 0;
		padding: var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
	}
	.canvas {
		width: 100%;
	}
	details {
		margin-top: var(--space-2);
	}
</style>
