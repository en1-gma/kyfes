import type { ChartValueFormat } from '@/shared/config/constants'

export type ChartSeries = { name: string; data: number[] }

/** Chart kinds and value formats live in shared/config/constants.ts. */
export {
  CHART_KIND,
  CHART_VALUE_FORMAT,
  type ChartKind,
  type ChartValueFormat,
} from '@/shared/config/constants'

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
