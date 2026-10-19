export const CHART_KIND = {
  bar: 'bar',
  line: 'line',
} as const;
export type ChartKind = (typeof CHART_KIND)[keyof typeof CHART_KIND];

export type ChartDatum = Record<string, string | number>;

export interface ChartSeries {
  /** Key of the numeric value in each datum. */
  key: string;
  /** Already translated series label. */
  label: string;
}

export interface ChartProps {
  /** Translated title: used as aria-label of the chart and as caption. */
  title: string;
  /** Optional translated textual summary (shown under the chart). */
  summary?: string;
  data: readonly ChartDatum[];
  /** Key of the category / x value in each datum. */
  xKey: string;
  series: readonly ChartSeries[];
  /** Format of x values (e.g. a month); defaults to String(). */
  formatX?: (value: string | number) => string;
  /** Format of numeric values; defaults to Intl number format of the current locale. */
  formatValue?: (value: number) => string;
  height?: number;
}

/** Props handed to the lazily-loaded Recharts implementation. */
export interface ChartCanvasProps extends Required<
  Pick<ChartProps, 'formatX' | 'formatValue' | 'height'>
> {
  kind: ChartKind;
  data: readonly ChartDatum[];
  xKey: string;
  series: readonly ChartSeries[];
}
