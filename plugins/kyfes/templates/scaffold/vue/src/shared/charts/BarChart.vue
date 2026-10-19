<script setup lang="ts">
import { computed } from 'vue'
import ChartFrame from './ChartFrame.vue'
import { buildCartesianOption } from './chart-options'
import { VChart } from './echarts'
import { CHART_KIND, type ChartProps } from './types'

const props = defineProps<ChartProps>()
const option = computed(() => buildCartesianOption(CHART_KIND.bar, props))
</script>

<template>
  <ChartFrame v-bind="props">
    <VChart :option="option" autoresize aria-hidden="true" />
  </ChartFrame>
</template>
