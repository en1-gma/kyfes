<script setup lang="ts">
import { computed } from 'vue'
import { BarChart, CHART_VALUE_FORMAT } from '@/shared/charts'
import { useT } from '@/shared/i18n'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui'
import { useOrderStatsChart } from '../api/orders.queries'

const { t } = useT()
const { chart, isPending, isError, error, refetch } = useOrderStatsChart()
const series = computed(() => [{ name: t('orders.chart.series'), data: chart.value.totals }])
</script>

<template>
  <section class="orders-chart">
    <h2>{{ t('orders.chart.title') }}</h2>
    <LoadingState v-if="isPending" />
    <ErrorState v-else-if="isError" :error="error" retry @retry="refetch()" />
    <EmptyState v-else-if="chart.categories.length === 0" />
    <BarChart
      v-else
      :label="t('orders.chart.title')"
      :categories="chart.categories"
      :series="series"
      :value-format="CHART_VALUE_FORMAT.currency"
    />
  </section>
</template>
