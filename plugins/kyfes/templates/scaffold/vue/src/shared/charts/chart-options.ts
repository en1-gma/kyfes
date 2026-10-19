import type { EChartsCoreOption } from 'echarts/core'
import { formatCurrency, formatNumber } from '@/shared/i18n'
import { CHART_KIND, CHART_VALUE_FORMAT, type ChartKind, type ChartProps } from './types'

const PALETTE_VARS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']
const PRIMARY_FALLBACK = '#2563eb'
const FALLBACK = [PRIMARY_FALLBACK, '#16a34a', '#d97706', '#9333ea', '#dc2626']

/** Palette from the design tokens (CSS variables on :root). */
export function readPalette(): string[] {
  const style = typeof window === 'undefined' ? undefined : getComputedStyle(document.documentElement)
  return PALETTE_VARS.map(
    (name, i) => style?.getPropertyValue(name).trim() || FALLBACK[i] || PRIMARY_FALLBACK,
  )
}

export function valueFormatter(props: ChartProps) {
  return (value: unknown): string => {
    const n = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(n)) return ''
    return props.valueFormat === CHART_VALUE_FORMAT.currency
      ? formatCurrency(n, props.currency)
      : formatNumber(n)
  }
}

/** Shared option for bar and line charts: Intl tooltip, CSP-safe rich-text rendering, palette, aria. */
export function buildCartesianOption(kind: ChartKind, props: ChartProps): EChartsCoreOption {
  const format = valueFormatter(props)
  return {
    color: readPalette(),
    aria: { enabled: true },
    animation: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    // richText renders the tooltip on canvas: no innerHTML/inline styles (strict CSP).
    tooltip: { trigger: 'axis', renderMode: 'richText', valueFormatter: format },
    legend: { show: props.series.length > 1, bottom: 0 },
    grid: { left: 8, right: 16, top: 16, bottom: props.series.length > 1 ? 40 : 16, containLabel: true },
    xAxis: { type: 'category', data: props.categories },
    yAxis: { type: 'value', axisLabel: { formatter: format } },
    series: props.series.map((s) => ({
      type: kind,
      name: s.name,
      data: s.data,
      smooth: kind === CHART_KIND.line,
      showSymbol: kind === CHART_KIND.line,
    })),
  }
}
