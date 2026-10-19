// Tree-shaken ECharts: only the pieces the wrappers use.
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart as EBarChart, LineChart as ELineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import 'vue-echarts/style.css'

use([CanvasRenderer, EBarChart, ELineChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent])

export { default as VChart } from 'vue-echarts'
