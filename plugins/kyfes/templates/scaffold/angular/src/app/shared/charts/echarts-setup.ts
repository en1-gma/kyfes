/**
 * Build "core" di ECharts con i soli moduli usati (tree shaking). Importato in lazy
 * da chart-frame tramite provideEchartsCore: finisce in un chunk separato.
 */
import { BarChart, LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer]);

export { echarts };
