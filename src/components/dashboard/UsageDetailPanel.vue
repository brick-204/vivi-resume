<template>
  <div class="usage-detail">
    <!-- 返回栏 -->
    <div class="usage-detail__back">
      <button class="back-btn" @click="$emit('back')">
        <Icon icon="mdi:arrow-left" :width="20" />
        返回
      </button>
      <h2 class="usage-detail__title">
        <Icon icon="mdi:chart-bar" :width="22" />
        流量详情
        <span v-if="configName" class="usage-detail__name">· {{ configName }}</span>
      </h2>
      <button class="refresh-btn" title="刷新" @click="refresh">
        <Icon icon="mdi:refresh" :width="18" :class="{ 'is-spinning': spinning }" />
      </button>
    </div>

    <!-- 数据说明 -->
    <div class="usage-detail__notice">
      <Icon icon="mdi:information-outline" :width="14" />
      <span>数据基于本地浏览器对 AI 调用的统计，仅供参考。精确用量与计费详情请前往对应服务供应商控制台查看。</span>
    </div>

    <!-- 空状态 -->
    <div v-if="!detail.hasData" class="usage-detail__empty">
      <Icon icon="mdi:chart-bar-stacked" :width="56" />
      <p>该配置暂无流量数据</p>
      <span>使用 AI 功能后，这里会展示请求与 Token 统计</span>
    </div>

    <template v-else>
      <!-- 汇总小卡片群 -->
      <section class="usage-detail__section">
        <h3 class="section__title">
          <Icon icon="mdi:view-dashboard-outline" :width="16" />
          总览
        </h3>
        <div class="stat-grid">
          <div v-for="c in overviewCards" :key="c.label" class="stat-card">
            <div class="stat-card__head">
              <Icon :icon="c.icon" :width="16" />
              <span class="stat-card__label">{{ c.label }}</span>
            </div>
            <div class="stat-card__value">{{ c.value }}</div>
            <div v-if="c.sub" class="stat-card__sub">
              <span v-for="s in c.sub" :key="s.label" class="stat-card__sub-item">
                {{ s.label }} <strong>{{ s.value }}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 4 个功能大卡片 -->
      <section v-for="f in featureSections" :key="f.key" class="usage-detail__section">
        <h3 class="section__title">
          <Icon :icon="f.icon" :width="16" />
          {{ f.label }}
        </h3>
        <div class="stat-grid">
          <div v-for="c in featureCards(f.key)" :key="c.label" class="stat-card">
            <div class="stat-card__head">
              <Icon :icon="c.icon" :width="16" />
              <span class="stat-card__label">{{ c.label }}</span>
            </div>
            <div class="stat-card__value">{{ c.value }}</div>
            <div v-if="c.sub" class="stat-card__sub">
              <span v-for="s in c.sub" :key="s.label" class="stat-card__sub-item">
                {{ s.label }} <strong>{{ s.value }}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 图表分析 -->
      <UsageCharts :config-id="props.configId" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import type { UsageFeature } from '@/stores/aiConfigStore'
import { getProviderInfo } from '@/types/aiConfig'
import UsageCharts from '@/components/dashboard/UsageCharts.vue'

const props = defineProps<{ configId: string }>()
defineEmits<{ back: [] }>()

const aiConfigStore = useAIConfigStore()

const isAll = computed(() => props.configId === '__all__')

const configName = computed(() => {
  if (isAll.value) return '全部配置'
  const c = aiConfigStore.configs.find(x => x.id === props.configId)
  if (!c) return ''
  const p = getProviderInfo(c.provider)
  return p ? `${c.name}（${p.name}）` : c.name
})

// 手动刷新 tick：点刷新按钮时自增，强制 detail 重算（兜底响应式未及时触发的场景）
const refreshTick = ref(0)
const spinning = ref(false)

const detail = computed(() => {
  // 依赖 refreshTick 与 usageByConfig：任一变化都重算
  void refreshTick.value
  void aiConfigStore.usageByConfig
  return isAll.value
    ? aiConfigStore.getTotalUsageDetail()
    : aiConfigStore.getUsageDetail(props.configId)
})

const refresh = () => {
  refreshTick.value++
  spinning.value = true
  // 旋转动画展示
  setTimeout(() => { spinning.value = false }, 500)
}

// 单位换算：≥1M 显示 M，≥1K 显示 K，否则原值；保留 1 位小数（整数时去 .0）
const fmt = (n: number) => {
  if (n >= 1_000_000) return `${trimZero(n / 1_000_000)} M`
  if (n >= 1_000) return `${trimZero(n / 1_000)} K`
  return n.toLocaleString()
}
const trimZero = (v: number) => {
  const r = v.toFixed(1)
  return r.endsWith('.0') ? r.slice(0, -2) : r
}

const avgLabel = computed(() => {
  const ms = detail.value.avgDurationMs
  if (ms <= 0) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
})

interface Card {
  icon: string
  label: string
  value: string
  /** 可选子项：展示在主值下方的小行（如输入/输出 token） */
  sub?: { label: string; value: string }[]
}

const overviewCards = computed<Card[]>(() => {
  const d = detail.value
  return [
    { icon: 'mdi:cloud-braces', label: '今日请求数', value: fmt(d.today.count) },
    { icon: 'mdi:cloud-check-outline', label: '总计请求数', value: fmt(d.total.count) },
    {
      icon: 'mdi:counter', label: '今日 Token', value: fmt(d.today.total),
      sub: [
        { label: '输入', value: fmt(d.today.prompt) },
        { label: '输出', value: fmt(d.today.completion) },
      ],
    },
    {
      icon: 'mdi:sigma', label: '累计 Token', value: fmt(d.total.total),
      sub: [
        { label: '输入', value: fmt(d.total.prompt) },
        { label: '输出', value: fmt(d.total.completion) },
      ],
    },
    { icon: 'mdi:timer-outline', label: 'API 平均响应', value: avgLabel.value },
  ]
})

const featureSections: { key: UsageFeature; label: string; icon: string }[] = [
  { key: 'consult', label: 'AI 咨询', icon: 'mdi:chat-processing-outline' },
  { key: 'resume', label: '简历功能', icon: 'mdi:file-document-edit-outline' },
  { key: 'interview', label: '面试功能', icon: 'mdi:account-tie-voice-outline' },
  { key: 'pet', label: '桌宠功能', icon: 'mdi:emoticon-outline' },
]

const featureCards = (f: UsageFeature): Card[] => {
  const today = detail.value.byFeature.today[f]
  const total = detail.value.byFeature.total[f]
  return [
    { icon: 'mdi:cloud-braces', label: '今日请求数', value: fmt(today.count) },
    { icon: 'mdi:cloud-check-outline', label: '总计请求数', value: fmt(total.count) },
    {
      icon: 'mdi:counter', label: '今日 Token', value: fmt(today.total),
      sub: [
        { label: '输入', value: fmt(today.prompt) },
        { label: '输出', value: fmt(today.completion) },
      ],
    },
    {
      icon: 'mdi:sigma', label: '累计 Token', value: fmt(total.total),
      sub: [
        { label: '输入', value: fmt(total.prompt) },
        { label: '输出', value: fmt(total.completion) },
      ],
    },
  ]
}
</script>

<style lang="scss" scoped>
.usage-detail {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  &__back {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    .usage-detail__title {
      flex: 1;
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: 700;
    color: $text-primary;
    @include gradient-text;
  }

  &__name {
    font-size: $font-size-sm;
    font-weight: 500;
    color: $text-secondary;
  }

  &__notice {
    display: flex;
    align-items: flex-start;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-md;
    background: rgba($primary-color, 0.06);
    border: 1px solid rgba($primary-color, 0.2);
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    color: $text-secondary;
    line-height: 1.6;

    .iconify {
      flex-shrink: 0;
      margin-top: 1px;
      color: $primary-light;
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-lg * 2 $spacing-md;
    color: $text-light;
    text-align: center;

    p {
      font-size: $font-size-sm;
      color: $text-secondary;
      margin: 0;
    }
    span {
      font-size: $font-size-xs;
    }
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    padding: $spacing-md;
    background: $bg-glass;
    border: 1px solid $border-glass;
    border-radius: $radius-lg;
  }
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px $spacing-sm;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  background: $bg-glass;
  color: $text-secondary;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    color: $primary-color;
    border-color: rgba($primary-color, 0.4);
  }
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  background: $bg-glass;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-base;
  flex-shrink: 0;

  &:hover {
    color: $primary-color;
    border-color: rgba($primary-color, 0.4);
  }

  .is-spinning {
    animation: usage-spin 0.5s ease;
  }
}

@keyframes usage-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-sm;

  @include tablet {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  @include glass-card;
  border: 1px solid $border-glass;
  // ponytail: 项目 shadow 变量全为 none（Apple 无阴影原则），此处用户显式要 3d 立体，自写阴影
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
  transition: transform $transition-base, box-shadow $transition-base;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.14);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    color: $text-light;
  }

  &__label {
    font-size: $font-size-xs;
  }

  &__value {
    font-size: $font-size-lg;
    font-weight: 700;
    color: $text-primary;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  &__sub {
    display: flex;
    gap: $spacing-md;
    padding-top: 2px;
    border-top: 1px solid $border-glass;
    font-size: $font-size-xs;
    color: $text-light;

    strong {
      color: $text-secondary;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  }

  &__sub-item {
    white-space: nowrap;
  }
}
</style>
