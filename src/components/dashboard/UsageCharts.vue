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
      <!-- 模型分布饼图 -->
      <div class="usage-charts__panel">
        <div class="usage-charts__panel-title">
          <Icon icon="mdi:chart-donut" :width="16" />
          模型分布
        </div>
        <div v-if="hasPieData" ref="pieEl" class="usage-charts__canvas" />
        <div v-else class="usage-charts__empty">该范围内暂无模型数据</div>
      </div>

      <!-- 功能分布饼图 -->
      <div class="usage-charts__panel">
        <div class="usage-charts__panel-title">
          <Icon icon="mdi:chart-arc" :width="16" />
          功能分布
        </div>
        <div v-if="hasFeaturePieData" ref="featureEl" class="usage-charts__canvas" />
        <div v-else class="usage-charts__empty">该范围内暂无功能数据</div>
      </div>
    </div>

    <!-- 趋势图：总请求量 -->
    <div class="usage-charts__panel usage-charts__panel--trend">
      <div class="usage-charts__panel-title">
        <Icon icon="mdi:chart-line" :width="16" />
        请求量趋势
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
      <div v-if="hasTrendData" ref="trendCountEl" class="usage-charts__canvas usage-charts__canvas--trend" />
      <div v-else class="usage-charts__empty usage-charts__empty--trend">该范围内暂无趋势数据</div>
    </div>

    <!-- 趋势图：累计 Token -->
    <div class="usage-charts__panel usage-charts__panel--trend">
      <div class="usage-charts__panel-title">
        <Icon icon="mdi:chart-line" :width="16" />
        Token 趋势
      </div>
      <div v-if="hasTrendData" ref="trendTokenEl" class="usage-charts__canvas usage-charts__canvas--trend" />
      <div v-else class="usage-charts__empty usage-charts__empty--trend">该范围内暂无趋势数据</div>
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
import type { RangeData, UsageFeature } from '@/stores/aiConfigStore'

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
const hasFeaturePieData = computed(() => data.value.featurePie.some(x => x.count > 0))
const hasTrendData = computed(() => data.value.trend.some(x => x.count > 0 || x.total > 0))

// ========== echarts 实例 ==========
const pieEl = ref<HTMLDivElement | null>(null)
const featureEl = ref<HTMLDivElement | null>(null)
const trendCountEl = ref<HTMLDivElement | null>(null)
const trendTokenEl = ref<HTMLDivElement | null>(null)
let pieChart: echarts.ECharts | null = null
let featureChart: echarts.ECharts | null = null
let trendCountChart: echarts.ECharts | null = null
let trendTokenChart: echarts.ECharts | null = null
const trendType = ref<'line' | 'bar'>('line')

// 趋势图功能线：总量 + 4 个功能，顺序即 legend 顺序
const TREND_FEATURES: { key: UsageFeature; label: string }[] = [
  { key: 'consult', label: 'AI 咨询' },
  { key: 'resume', label: '简历功能' },
  { key: 'interview', label: '面试功能' },
  { key: 'pet', label: '桌宠功能' },
]

const fmtNum = (n: number) => n.toLocaleString()

// ===== tooltip HTML 样式（四个图共用）=====
// 卡片底色/边框走 echarts 默认主题色，这里只管文字排版
const TIP_TITLE = 'font-weight:700;font-size:13px;display:block;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(127,127,127,0.3);'
const TIP_TOTAL = 'font-weight:600;display:flex;justify-content:space-between;gap:16px;margin-bottom:4px;'
const TIP_ROW = 'display:flex;justify-content:space-between;gap:16px;line-height:1.7;'
const TIP_LABEL = 'color:#9b9b9b;'
const TIP_VAL = 'font-weight:600;font-variant-numeric:tabular-nums;'

/** 饼图气泡：标题(模块名) + 总请求量 + 累计 Token */
const pieTip = (name: string, count: number, total: number) =>
  `<span style="${TIP_TITLE}">${name}</span>` +
  `<div style="${TIP_TOTAL}"><span>总请求量</span><span style="${TIP_VAL}">${fmtNum(count)}</span></div>` +
  `<div style="${TIP_ROW}"><span style="${TIP_LABEL}">累计 Token</span><span style="${TIP_VAL}">${fmtNum(total)}</span></div>`

/** 趋势图单行：色块圆点 + 标签 + 数值 */
const trendRow = (color: string, label: string, val: number, bold = false) =>
  `<div style="${TIP_ROW}">` +
  `<span style="${bold ? 'font-weight:600;' : TIP_LABEL}"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle;"></span>${label}</span>` +
  `<span style="${TIP_VAL}">${fmtNum(val)}</span></div>`

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
        pieTip(p.name, p.value, p.data?.total ?? 0),
      extraCssText: 'max-width:240px;',
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

const renderFeaturePie = () => {
  if (!hasFeaturePieData.value) {
    featureChart?.dispose()
    featureChart = null
    return
  }
  if (!featureEl.value) return
  if (!featureChart || featureChart.getDom() !== featureEl.value) {
    featureChart?.dispose()
    featureChart = echarts.init(featureEl.value)
  }
  featureChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; data: { total: number } }) =>
        pieTip(p.name, p.value, p.data?.total ?? 0),
      extraCssText: 'max-width:240px;',
    },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      label: { show: false },
      data: data.value.featurePie.map(x => ({ name: x.name, value: x.count, total: x.total })),
    }],
  }, true)
}

/**
 * 构造趋势图 option。
 * @param metric 'count' = 请求量趋势，'total' = Token 趋势
 * 5 条线：总量 + 4 个功能；气泡顶部总量，下面列各功能明细。
 */
const buildTrendOption = (metric: 'count' | 'total', totalLabel: string, axisName: string) => {
  const trend = data.value.trend
  const labels = trend.map(x => x.label)
  const seriesNames = [totalLabel, ...TREND_FEATURES.map(f => f.label)]
  const seriesData: number[][] = [
    trend.map(x => x[metric]),
    ...TREND_FEATURES.map(f => trend.map(x => x.features[f.key][metric])),
  ]
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ axisValue: string; seriesName: string; color: string }>) => {
        if (!params.length) return ''
        const t = params[0].axisValue
        const idx = labels.indexOf(t)
        const total = trend[idx]?.[metric] ?? 0
        // 按 params 顺序取色（params 已按 series 顺序排列）
        const colorByName = new Map(params.map(p => [p.seriesName, p.color]))
        const totalColor = colorByName.get(totalLabel) ?? '#888'
        const rows = TREND_FEATURES.map(f => {
          const v = trend[idx]?.features[f.key][metric] ?? 0
          return trendRow(colorByName.get(f.label) ?? '#888', f.label, v)
        })
        return `<span style="${TIP_TITLE}">${t}</span>` +
          trendRow(totalColor, totalLabel, total, true) +
          rows.join('')
      },
      extraCssText: 'max-width:260px;',
    },
    legend: { data: seriesNames, bottom: 0, type: 'scroll' },
    grid: { left: 48, right: 24, top: 16, bottom: 40 },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', name: axisName, nameTextStyle: { fontSize: 10 } },
    series: seriesNames.map((name, i) => ({
      name,
      type: trendType.value,
      data: seriesData[i],
      smooth: true,
    })),
  }
}

/** 通用：把 option 绑到给定 el + 实例槽位（无数据时释放） */
const paintTrend = (
  el: HTMLDivElement | null,
  getChart: () => echarts.ECharts | null,
  setChart: (c: echarts.ECharts | null) => void,
  option: ReturnType<typeof buildTrendOption>,
) => {
  if (!hasTrendData.value) {
    getChart()?.dispose()
    setChart(null)
    return
  }
  if (!el) return
  if (!getChart() || getChart()!.getDom() !== el) {
    getChart()?.dispose()
    setChart(echarts.init(el))
  }
  getChart()!.setOption(option, true)
}

const renderTrendCount = () =>
  paintTrend(trendCountEl.value, () => trendCountChart, c => { trendCountChart = c }, buildTrendOption('count', '总请求量', '请求量'))
const renderTrendToken = () =>
  paintTrend(trendTokenEl.value, () => trendTokenChart, c => { trendTokenChart = c }, buildTrendOption('total', '累计 Token', 'Token'))

const render = () => {
  nextTick(() => { renderPie(); renderFeaturePie(); renderTrendCount(); renderTrendToken() })
}

const onResize = () => { pieChart?.resize(); featureChart?.resize(); trendCountChart?.resize(); trendTokenChart?.resize() }

onMounted(() => {
  render()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  pieChart?.dispose(); featureChart?.dispose(); trendCountChart?.dispose(); trendTokenChart?.dispose()
  pieChart = null; featureChart = null; trendCountChart = null; trendTokenChart = null
})

watch(data, () => render())
watch(trendType, () => { renderTrendCount(); renderTrendToken() })
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
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-md;

    @include tablet {
      grid-template-columns: 1fr;
    }
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
