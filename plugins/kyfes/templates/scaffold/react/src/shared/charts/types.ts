import type { CHART_DATUM_KEY, CHART_VARIANT } from '@/shared/config/constants';

export type CartesianVariant = (typeof CHART_VARIANT)[keyof typeof CHART_VARIANT];

export interface ChartDatum {
  /** Already formatted category label (e.g. "mar 2026"). */
  [CHART_DATUM_KEY.label]: string;
  [CHART_DATUM_KEY.value]: number;
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
