<script lang="ts">
	import CategoryChart from './CategoryChart.svelte';
	import { CHART_KIND, type CategoryChartProps } from './options';

	let props: CategoryChartProps = $props();
</script>

<CategoryChart kind={CHART_KIND.line} {...props} />
