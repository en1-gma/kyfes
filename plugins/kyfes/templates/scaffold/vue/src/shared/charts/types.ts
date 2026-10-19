export type ChartSeries = { name: string; data: number[] }

export type ChartValueFormat = 'number' | 'currency'

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
