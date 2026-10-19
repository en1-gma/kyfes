export type ChartSeries = { name: string; data: number[] }

/** Series types the wrappers render (ECharts `series.type`). */
export const CHART_KIND = { bar: 'bar', line: 'line' } as const
export type ChartKind = (typeof CHART_KIND)[keyof typeof CHART_KIND]

/** How values are formatted in tooltip and axis. */
export const CHART_VALUE_FORMAT = { number: 'number', currency: 'currency' } as const
export type ChartValueFormat = (typeof CHART_VALUE_FORMAT)[keyof typeof CHART_VALUE_FORMAT]

export type ChartProps = {
  /** Accessible name (already translated): describes what the chart shows. */
  label: string
  /** X axis categories (already formatted, e.g. with formatMonth). */
  categories: string[]
  series: ChartSeries[]
  valueFormat?: ChartValueFormat
  currency?: string
  height?: number
}
