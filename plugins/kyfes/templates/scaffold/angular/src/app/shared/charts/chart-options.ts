import type { EChartsCoreOption } from 'echarts/core';

export type ChartKind = 'bar' | 'line';
export type ChartValueFormat = 'number' | 'currency';

export interface ChartSeries {
  /** Nome già tradotto (legenda/tooltip). */
  name: string;
  values: number[];
}

export interface CartesianChartData {
  categories: string[];
  series: ChartSeries[];
}

const FALLBACK_PALETTE = ['#1f5fbf', '#c2410c', '#15803d', '#7e22ce', '#be123c', '#0f766e'];

/** Palette dai token CSS `--chart-1…--chart-6` (definiti in styles.css). */
export function readPalette(element: Element | null): string[] {
  if (!element || typeof getComputedStyle !== 'function') return FALLBACK_PALETTE;
  const style = getComputedStyle(element);
  return FALLBACK_PALETTE.map((fallback, i) => style.getPropertyValue(`--chart-${i + 1}`).trim() || fallback);
}

/** Opzioni ECharts pure (testabili senza DOM). */
export function buildCartesianOptions(
  kind: ChartKind,
  data: CartesianChartData,
  palette: string[],
  formatValue: (value: number) => string,
): EChartsCoreOption {
  return {
    color: palette,
    aria: { enabled: true, decal: { show: true } },
    animation: false,
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: unknown) => (typeof value === 'number' ? formatValue(value) : String(value)),
    },
    xAxis: { type: 'category', data: data.categories },
    yAxis: { type: 'value', axisLabel: { formatter: (value: number) => formatValue(value) } },
    series: data.series.map((s) => ({
      type: kind,
      name: s.name,
      data: s.values,
      ...(kind === 'line' ? { smooth: true, showSymbol: true } : { barMaxWidth: 48 }),
    })),
  };
}
