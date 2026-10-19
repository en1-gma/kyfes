<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/shared/i18n'
import { valueFormatter } from './chart-options'
import type { ChartProps } from './types'

const props = defineProps<ChartProps>()
const { t } = useT()
const format = computed(() => valueFormatter(props))
</script>

<template>
  <figure class="chart">
    <div class="chart__canvas" role="img" :aria-label="label" :style="{ height: `${height ?? 280}px` }">
      <slot />
    </div>
    <details class="chart__data">
      <summary>{{ t('common.chart.dataTable') }}</summary>
      <table>
        <caption class="visually-hidden">
          {{
            label
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('common.chart.category') }}</th>
            <th v-for="s in series" :key="s.name" scope="col">{{ s.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(category, i) in categories" :key="category">
            <th scope="row">{{ category }}</th>
            <td v-for="s in series" :key="s.name">{{ format(s.data[i]) }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
}
.chart__canvas {
  width: 100%;
}
.chart__data {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
}
.chart__data table {
  border-collapse: collapse;
}
.chart__data th,
.chart__data td {
  padding: var(--space-1) var(--space-2);
  text-align: start;
  border-bottom: 1px solid var(--color-border);
}
</style>
