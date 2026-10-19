import type { EChartsCoreOption } from 'echarts/core';
import { CHART_FALLBACK_PALETTE, CHART_KIND, type CHART_VALUE_FORMAT } from '@shared/config/constants';

export { CHART_KIND, CHART_VALUE_FORMAT } from '@shared/config/constants';

export type ChartKind = (typeof CHART_KIND)[keyof typeof CHART_KIND];
export type ChartValueFormat = (typeof CHART_VALUE_FORMAT)[keyof typeof CHART_VALUE_FORMAT];

export interface ChartSeries {
  /** Nome già tradotto (legenda/tooltip). */
  name: string;
  values: number[];
}

export interface CartesianChartData {
  categories: string[];
  series: ChartSeries[];
}

/** Palette dai token CSS `--chart-1…--chart-6` (definiti in styles.css). */
export function readPalette(element: Element | null): string[] {
  if (!element || typeof getComputedStyle !== 'function') return [...CHART_FALLBACK_PALETTE];
  const style = getComputedStyle(element);
  return CHART_FALLBACK_PALETTE.map(
    (fallback, i) => style.getPropertyValue(`--chart-${i + 1}`).trim() || fallback,
  );
}

/** Parametri del formatter del tooltip ECharts (trigger `axis`) usati qui. */
export interface TooltipParam {
  seriesIndex?: number;
  seriesName?: string;
  axisValueLabel?: string;
  name?: string;
  value?: unknown;
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * Contenuto del tooltip costruito con il DOM e classi CSS (styles.css), mai HTML con `style=`
 * inline: la CSP (`style-src 'self' 'nonce-…'`) bloccherebbe gli attributi `style` del markup
 * di default di ECharts. Il colore del marker viene dalla classe `--N` (token `--chart-N`).
 */
export function buildTooltipContent(
  params: TooltipParam | TooltipParam[],
  formatValue: (value: number) => string,
  paletteSize: number = CHART_FALLBACK_PALETTE.length,
): HTMLElement {
  const items = Array.isArray(params) ? params : [params];
  const root = element('div', 'chart-tooltip__content');
  const first = items[0];
  root.append(element('div', 'chart-tooltip__title', first?.axisValueLabel ?? first?.name ?? ''));
  for (const item of items) {
    const row = element('div', 'chart-tooltip__row');
    const index = ((item.seriesIndex ?? 0) % paletteSize) + 1;
    row.append(
      element('span', `chart-tooltip__marker chart-tooltip__marker--${index}`),
      element('span', 'chart-tooltip__name', item.seriesName ?? ''),
      element(
        'span',
        'chart-tooltip__value',
        typeof item.value === 'number' ? formatValue(item.value) : String(item.value ?? ''),
      ),
    );
    root.append(row);
  }
  return root;
}

/** Opzioni ECharts pure (testabili senza DOM; il DOM serve solo al formatter del tooltip). */
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
      renderMode: 'html',
      className: 'chart-tooltip',
      formatter: (params: TooltipParam | TooltipParam[]) =>
        buildTooltipContent(params, formatValue, palette.length || CHART_FALLBACK_PALETTE.length),
    },
    xAxis: { type: 'category', data: data.categories },
    yAxis: { type: 'value', axisLabel: { formatter: (value: number) => formatValue(value) } },
    series: data.series.map((s) => ({
      type: kind,
      name: s.name,
      data: s.values,
      ...(kind === CHART_KIND.line ? { smooth: true, showSymbol: true } : { barMaxWidth: 48 }),
    })),
  };
}
