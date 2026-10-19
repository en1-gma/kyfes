/**
 * The only entry point to charts. The ECharts library itself is loaded lazily the first time a
 * chart mounts; features can also lazy-load the component (`{#await import(...)}`).
 */
export { default as BarChart } from './BarChart.svelte';
export { default as LineChart } from './LineChart.svelte';
export type { CategoryChartProps, ChartDatum } from './options';
