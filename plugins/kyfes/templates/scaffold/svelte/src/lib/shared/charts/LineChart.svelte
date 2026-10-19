<script lang="ts">
	import CategoryChart from './CategoryChart.svelte';
	import type { CategoryChartProps } from './options';

	let props: CategoryChartProps = $props();
</script>

<CategoryChart kind="line" {...props} />
