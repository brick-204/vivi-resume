<template>
  <section class="usage-charts">
    <h3 class="section__title">
      <Icon icon="mdi:chart-box-outline" :width="16" />
      图表分析
    </h3>

    <!-- 时间范围选择 -->
    <div class="usage-charts__range">
      <NSelect
        v-model:value="rangePreset"
        :options="rangeOptions"
        size="small"
        style="width: 140px"
        @update:value="onPresetChange"
      />
      <NDatePicker
        v-if="rangePreset === 'custom'"
        v-model:value="customRange"
        type="daterange"
        size="small"
        clearable
        :is-date-disabled="isDateDisabled"
        @update:value="onCustomChange"
      />
      <span class="usage-charts__range-label">{{ rangeLabel }}</span>
    </div>

    <div class="usage-charts__grid">
      <!-- 饼图 -->
      <div class="usage-charts__panel">
        <div class="usage-charts__panel-title">
          <Icon icon="mdi:chart-donut" :width="16" />
          模型分布
        </div>
        <div v-if="hasPieData" ref="pieEl" class="usage-charts__canvas" />
        <div v-else class="usage-charts__empty">该范围内暂无模型数据</div>
      </div>

      <!-- 趋势图 -->
      <div class="usage-charts__panel">
        <div class="usage-charts__panel-title">
          <Icon icon="mdi:chart-line" :width="16" />
          流量趋势
          <div class="usage-charts__toggle">
            <button
              :class="['toggle-btn', { 'toggle-btn--active': trendType === 'line' }]"
              title="折线图"
              @click="trendType = 'line'"
            >
              <Icon icon="mdi:chart-line" :width="16" />
            </button>
            <button
              :class="['toggle-btn', { 'toggle-btn--active': trendType === 'bar' }]"
              title="柱状图"
              @click="trendType = 'bar'"
            >
              <Icon icon="mdi:chart-histogram" :width="16" />
            </button>
          </div>
        </div>
        <div v-if="hasTrendData" ref="trendEl" class="usage-charts__canvas usage-charts__canvas--trend" />
        <div v-else class="usage-charts__empty usage-charts__empty--trend">该范围内暂无趋势数据</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { NSelect, NDatePicker } from 'naive-ui'
import * as echarts from 'echarts/core'
import { PieChart, LineChart, BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import type { RangeData } from '@/stores/aiConfigStore'

echarts.use([PieChart, LineChart, BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

const props = defineProps<{ configId: string }>()
const aiConfigStore = useAIConfigStore()

// ========== 时间范围 ==========
type Preset = 'today' | 'yesterday' | '3d' | '7d' | '14d' | '30d' | 'thisMonth' | 'lastMonth' | 'custom'
const rangePreset = ref<Preset>('today')
const customRange = ref<[number, number] | null>(null)

const rangeOptions = [
  { label: '自定义', value: 'custom' },
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '近 3 天', value: '3d' },
  { label: '近 7 天', value: '7d' },
  { label: '近 14 天', value: '14d' },
  { label: '近 30 天', value: '30d' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
]

const fmtDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 禁止选择今天之后的日期 */
const isDateDisabled = (ts: number) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return ts > today.getTime()
}

const { start, end } = useRange()

function useRange() {
  const start = computed(() => calcRange().start)
  const end = computed(() => calcRange().end)
  function calcRange(): { start: string; end: string } {
    const now = new Date()
    const today = fmtDate(now)
    switch (rangePreset.value) {
      case 'today': return { start: today, end: today }
      case 'yesterday': {
        const y = new Date(); y.setDate(y.getDate() - 1)
        const ys = fmtDate(y)
        return { start: ys, end: ys }
      }
      case '3d': {
        const y = new Date(); y.setDate(y.getDate() - 2)
        return { start: fmtDate(y), end: today }
      }
      case '7d': {
        const y = new Date(); y.setDate(y.getDate() - 6)
        return { start: fmtDate(y), end: today }
      }
      case '14d': {
        const y = new Date(); y.setDate(y.getDate() - 13)
        return { start: fmtDate(y), end: today }
      }
      case '30d': {
        const y = new Date(); y.setDate(y.getDate() - 29)
        return { start: fmtDate(y), end: today }
      }
      case 'thisMonth': {
        return { start: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: today }
      }
      case 'lastMonth': {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const e = new Date(now.getFullYear(), now.getMonth(), 0)
        return { start: fmtDate(s), end: fmtDate(e) }
      }
      case 'custom': {
        if (customRange.value) {
          return { start: fmtDate(new Date(customRange.value[0])), end: fmtDate(new Date(customRange.value[1])) }
        }
        return { start: today, end: today }
      }
    }
  }
  return { start, end }
}

const rangeLabel = computed(() => `${start.value} ~ ${end.value}`)

const onPresetChange = () => { render() }
const onCustomChange = (v: [number, number] | null) => { customRange.value = v; render() }

// ========== 数据 ==========
const refreshTick = ref(0)
const data = computed<RangeData>(() => {
  void refreshTick.value
  void aiConfigStore.usageByConfig
  return aiConfigStore.getRangeData(start.value, end.value, props.configId)
})

const hasPieData = computed(() => data.value.modelPie.some(x => x.count > 0))
const hasTrendData = computed(() => data.value.trend.some(x => x.count > 0 || x.total > 0))

// ========== echarts 实例 ==========
const pieEl = ref<HTMLDivElement | null>(null)
const trendEl = ref<HTMLDivElement | null>(null)
let pieChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
const trendType = ref<'line' | 'bar'>('line')

const fmtNum = (n: number) => n.toLocaleString()

const renderPie = () => {
  if (!hasPieData.value) {
    // 无数据时释放旧实例（dispose 不依赖 DOM 存在——v-if 移除 DOM 后 pieEl.value 为 null，必须先于 null 检查执行）
    pieChart?.dispose()
    pieChart = null
    return
  }
  if (!pieEl.value) return
  // 实例已失效或未建，重新绑定到当前 DOM
  if (!pieChart || pieChart.getDom() !== pieEl.value) {
    pieChart?.dispose()
    pieChart = echarts.init(pieEl.value)
  }
  pieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; data: { total: number } }) =>
        `${p.name}<br/>请求量：${fmtNum(p.value)}<br/>累计 Token：${fmtNum(p.data?.total ?? 0)}`,
    },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      label: { show: false },
      data: data.value.modelPie.map(x => ({ name: x.name, value: x.count, total: x.total })),
    }],
  }, true)
}

const renderTrend = () => {
  if (!hasTrendData.value) {
    trendChart?.dispose()
    trendChart = null
    return
  }
  if (!trendEl.value) return
  if (!trendChart || trendChart.getDom() !== trendEl.value) {
    trendChart?.dispose()
    trendChart = echarts.init(trendEl.value)
  }
  const labels = data.value.trend.map(x => x.label)
  const counts = data.value.trend.map(x => x.count)
  const totals = data.value.trend.map(x => x.total)
  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ axisValue: string; data: number; seriesName: string }>) => {
        if (!params.length) return ''
        const t = params[0].axisValue
        const count = counts[labels.indexOf(t)] ?? 0
        const total = totals[labels.indexOf(t)] ?? 0
        return `${t}<br/>请求量：${fmtNum(count)}<br/>累计 Token：${fmtNum(total)}`
      },
    },
    legend: { data: ['请求量', '累计 Token'], bottom: 0 },
    grid: { left: 48, right: 56, top: 16, bottom: 40 },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '请求量', nameTextStyle: { fontSize: 10 } },
      { type: 'value', name: 'Token', nameTextStyle: { fontSize: 10 } },
    ],
    series: [
      { name: '请求量', type: trendType.value, data: counts, yAxisIndex: 0, smooth: true },
      { name: '累计 Token', type: trendType.value, data: totals, yAxisIndex: 1, smooth: true },
    ],
  }, true)
}

const render = () => {
  nextTick(() => { renderPie(); renderTrend() })
}

const onResize = () => { pieChart?.resize(); trendChart?.resize() }

onMounted(() => {
  render()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  pieChart?.dispose(); trendChart?.dispose()
  pieChart = null; trendChart = null
})

watch(data, () => render())
watch(trendType, () => renderTrend())
watch(() => props.configId, () => render())
</script>

<style lang="scss" scoped>
.usage-charts {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;

  &__range {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-wrap: wrap;
  }

  &__range-label {
    font-size: $font-size-xs;
    color: $text-light;
    font-variant-numeric: tabular-nums;
  }

  &__grid {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }

  &__panel {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-sm;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
    background: rgba(0, 0, 0, 0.02);
  }

  &__panel-title {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
  }

  &__canvas {
    width: 100%;
    height: 240px;

    &--trend {
      height: 360px;
    }
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 240px;
    color: $text-light;
    font-size: $font-size-xs;

    &--trend {
      height: 360px;
    }
  }

  &__toggle {
    display: flex;
    gap: 2px;
    margin-left: auto;
  }
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  background: transparent;
  color: $text-light;
  cursor: pointer;
  transition: all $transition-base;

  &--active {
    color: $primary-color;
    border-color: rgba($primary-color, 0.4);
    background: rgba($primary-color, 0.08);
  }
}

.section__title {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
  margin: 0;
}
</style>
