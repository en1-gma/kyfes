export interface ChartDatum {
  /** Already formatted category label (e.g. "mar 2026"). */
  label: string;
  value: number;
}

export interface ChartProps {
  /** Accessible name of the chart (role="img" + aria-label) and visible caption. */
  title: string;
  /** Short textual summary for screen readers and sighted users. */
  description?: string | undefined;
  /** Name of the series, used in the tooltip and as table header. */
  seriesLabel: string;
  data: readonly ChartDatum[];
  /** Intl formatter from shared/i18n (formatCurrency, formatNumber…). */
  formatValue?: ((value: number) => string) | undefined;
  height?: number | undefined;
}

/** Palette from CSS custom properties (app/styles.css): theme changes need no JS. */
export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'] as const;
