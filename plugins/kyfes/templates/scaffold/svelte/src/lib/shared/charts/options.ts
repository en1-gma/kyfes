import {
	CHART_COLOR_VARS,
	CHART_FALLBACK_COLORS,
	CHART_KIND,
	CHART_PALETTE_VARS
} from '$lib/shared/config/constants';
import type { ChartOption } from './echarts';

export type ChartDatum = { label: string; value: number };
/** Series types the shared charts draw (defined in shared/config/constants.ts). */
export { CHART_KIND };
export type ChartKind = (typeof CHART_KIND)[keyof typeof CHART_KIND];

export type CategoryChartProps = {
	/** Accessible name of the chart (role="img"). Already translated. */
	title: string;
	/** Short textual summary for screen readers. Already translated. */
	description?: string;
	/** Series name shown in the tooltip and in the data table header. */
	seriesName: string;
	/** Header of the category column of the data table. */
	categoryName: string;
	data: ChartDatum[];
	/** Intl formatter (shared/i18n) for values. */
	formatValue?: (value: number) => string;
	height?: number;
};

/** Palette and text colours from the CSS design tokens (shared/ui/theme.css). */
export function readTheme(element: Element) {
	const style = getComputedStyle(element);
	const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
	return {
		palette: CHART_PALETTE_VARS.map((name) => read(name, CHART_FALLBACK_COLORS.series)),
		text: read(CHART_COLOR_VARS.text, CHART_FALLBACK_COLORS.text),
		border: read(CHART_COLOR_VARS.border, CHART_FALLBACK_COLORS.border)
	};
}

export function buildCategoryOption(
	kind: ChartKind,
	props: Pick<CategoryChartProps, 'data' | 'seriesName' | 'formatValue'>,
	theme: ReturnType<typeof readTheme>
): ChartOption {
	const format = props.formatValue ?? ((value: number) => String(value));
	const axisLabel = { color: theme.text };
	return {
		color: theme.palette,
		animation: false,
		grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
		// richText: the tooltip is drawn on the canvas (no innerHTML, no inline styles).
		tooltip: { trigger: 'axis', renderMode: 'richText', valueFormatter: (v) => format(Number(v)) },
		xAxis: {
			type: 'category',
			data: props.data.map((d) => d.label),
			axisLabel,
			axisLine: { lineStyle: { color: theme.border } }
		},
		yAxis: { type: 'value', axisLabel: { ...axisLabel, formatter: (v: number) => format(v) } },
		series: [
			kind === CHART_KIND.bar
				? { type: CHART_KIND.bar, name: props.seriesName, data: props.data.map((d) => d.value) }
				: {
						type: CHART_KIND.line,
						name: props.seriesName,
						data: props.data.map((d) => d.value),
						smooth: true
					}
		]
	};
}
