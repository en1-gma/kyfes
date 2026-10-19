import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import type { ComposeOption, EChartsType } from 'echarts/core';

export type ChartOption = ComposeOption<
	BarSeriesOption | LineSeriesOption | GridComponentOption | TooltipComponentOption
>;
export type ChartInstance = EChartsType;

/**
 * ECharts is loaded on demand (own chunk) and only with the modules we use
 * (tree-shaken `echarts/core` + canvas renderer: no inline HTML/styles, CSP friendly).
 */
let loading: Promise<typeof import('echarts/core')> | undefined;

export function loadECharts(): Promise<typeof import('echarts/core')> {
	loading ??= Promise.all([
		import('echarts/core'),
		import('echarts/charts'),
		import('echarts/components'),
		import('echarts/renderers')
	]).then(([core, charts, components, renderers]) => {
		core.use([
			charts.BarChart,
			charts.LineChart,
			components.GridComponent,
			components.TooltipComponent,
			renderers.CanvasRenderer
		]);
		return core;
	});
	return loading;
}
