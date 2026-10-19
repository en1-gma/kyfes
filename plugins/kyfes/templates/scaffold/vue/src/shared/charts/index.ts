import { defineAsyncComponent } from 'vue'

/** Lazy wrappers: ECharts ends up in its own chunk, loaded only where a chart is shown. */
export const BarChart = defineAsyncComponent(() => import('./BarChart.vue'))
export const LineChart = defineAsyncComponent(() => import('./LineChart.vue'))
export type { ChartProps, ChartSeries, ChartValueFormat } from './types'
