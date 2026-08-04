<template>
  <n-modal
    :show="visible"
    preset="card"
    :auto-focus="false"
    :style="{ maxWidth: '640px', width: '90vw' }"
    @update:show="(v: boolean) => { if (!v) emit('close') }"
  >
    <template #header>
      <div class="route-header">
        <Icon icon="mdi:map-marker-distance" :width="20" />
        <span>到这里去 · {{ company || '未命名' }}</span>
      </div>
    </template>

    <div class="route-endpoints">
      <div class="route-endpoint">
        <Icon icon="mdi:crosshairs-gps" :width="16" class="route-endpoint__icon route-endpoint__icon--from" />
        <span class="route-endpoint__label">我的位置</span>
      </div>
      <Icon icon="mdi:arrow-down" :width="14" class="route-endpoints__arrow" />
      <div class="route-endpoint">
        <Icon icon="mdi:map-marker" :width="16" class="route-endpoint__icon route-endpoint__icon--to" />
        <span class="route-endpoint__label">{{ endLabel }}</span>
      </div>
    </div>

    <n-tabs v-model:value="activeMode" type="line" animated @update:value="onTabChange">
      <n-tab-pane v-for="m in MODES" :key="m.value" :name="m.value" :tab="m.label">
        <div class="route-body">
          <p v-if="errorMsg" class="route-state route-state--error">
            <Icon icon="mdi:alert-circle-outline" :width="16" />
            {{ errorMsg }}
          </p>
          <div v-else-if="loading" class="route-state">
            <Icon icon="mdi:loading" :width="20" class="route-state__spin" />
            正在规划路线…
          </div>
          <p v-else-if="plans.length === 0" class="route-state">
            <Icon icon="mdi:map-marker-off-outline" :width="16" />
            没有找到可行路线
          </p>
          <ul v-else class="route-list">
            <li v-for="(p, idx) in plans" :key="idx" class="route-item" :class="{ 'is-open': expandedIdx === idx }">
              <button type="button" class="route-item__head" @click="toggleExpand(idx)">
                <span class="route-item__index">方案 {{ idx + 1 }}</span>
                <span class="route-item__duration">{{ formatDuration(p.duration) }}</span>
                <span class="route-item__distance">{{ formatDistance(p.distance) }}</span>
                <Icon
                  v-if="p.segments.length > 0"
                  icon="mdi:chevron-down"
                  :width="18"
                  class="route-item__arrow"
                  :class="{ 'is-open': expandedIdx === idx }"
                />
              </button>
              <p v-if="p.summary" class="route-item__summary">{{ p.summary }}</p>
              <ol v-if="p.segments.length > 0 && expandedIdx === idx" class="route-segs">
                <li v-for="(seg, sIdx) in p.segments" :key="sIdx" class="route-seg">
                  <span class="route-seg__badge" :class="`route-seg__badge--${segBadgeClass(seg.type)}`">{{ seg.type }}</span>
                  <div class="route-seg__body">
                    <div class="route-seg__title">{{ seg.title }}</div>
                    <div class="route-seg__meta">
                      <span v-if="seg.duration">{{ formatDuration(seg.duration) }}</span>
                      <span v-if="seg.detail">{{ seg.detail }}</span>
                    </div>
                  </div>
                </li>
              </ol>
            </li>
          </ul>
        </div>
      </n-tab-pane>
    </n-tabs>

    <template #action>
      <NButton @click="emit('close')">关闭</NButton>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NTabs, NTabPane, NButton } from 'naive-ui'
import { planRoute, formatDistance, formatDuration, type LngLat, type RouteMode, type RoutePlan } from '@/services/amapService'
import { useSettingsStore } from '@/stores/settingsStore'

const props = defineProps<{
  visible: boolean
  company: string
  endLabel: string
  from: LngLat | null
  to: LngLat | null
}>()

const emit = defineEmits<{ close: [] }>()

const settingsStore = useSettingsStore()

const MODES: { value: RouteMode; label: string }[] = [
  { value: 'transfer', label: '公交地铁' },
  { value: 'driving', label: '驾车' },
  { value: 'walking', label: '步行' },
  { value: 'riding', label: '骑行' },
]

const activeMode = ref<RouteMode>('transfer')
const plans = ref<RoutePlan[]>([])
const loading = ref(false)
const errorMsg = ref('')
// ponytail: 展开态——同一时间只展开一个方案（null=全折叠），切 tab/重新加载时重置
const expandedIdx = ref<number | null>(null)

function toggleExpand(idx: number) {
  expandedIdx.value = expandedIdx.value === idx ? null : idx
}

// ponytail: 段类型 → badge 配色 class（步行灰、地铁蓝、公交绿、驾车橙、骑行紫、其余默认）
function segBadgeClass(type: string): string {
  switch (type) {
    case '步行': return 'walk'
    case '地铁': return 'subway'
    case '公交': return 'bus'
    case '驾车': return 'drive'
    case '骑行': return 'ride'
    default: return 'other'
  }
}

async function load(mode: RouteMode) {
  if (!props.from || !props.to) return
  loading.value = true
  errorMsg.value = ''
  plans.value = []
  expandedIdx.value = null
  try {
    plans.value = await planRoute(
      mode,
      props.from,
      props.to,
      settingsStore.amapKey,
      settingsStore.amapSecurityCode,
    )
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '路线规划失败'
  } finally {
    loading.value = false
  }
}

function onTabChange(mode: RouteMode) {
  activeMode.value = mode
  load(mode)
}

// 弹窗打开时加载首个 tab（from/to 由调用方在打开前确定，打开后不变，故无需监听）
watch(
  () => props.visible,
  (v) => {
    if (v) {
      activeMode.value = 'transfer'
      load('transfer')
    }
  },
)
</script>

<style lang="scss" scoped>
.route-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.route-endpoints {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: $spacing-sm $spacing-md;
  margin-bottom: $spacing-md;
  background: $bg-glass;
  border-radius: $radius-md;
  border: 1px solid $border-glass;

  &__arrow {
    color: $text-light;
    margin-left: 3px;
  }
}

.route-endpoint {
  display: flex;
  align-items: center;
  gap: $spacing-xs;

  &__icon {
    flex-shrink: 0;

    &--from {
      color: #1989fa;
    }
    &--to {
      color: $error-color;
    }
  }

  &__label {
    font-size: $font-size-sm;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.route-body {
  min-height: 180px;
}

.route-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
  color: $text-secondary;
  font-size: $font-size-sm;
  padding: $spacing-xl 0;

  &--error {
    color: $error-color;
  }

  &__spin {
    animation: route-spin 0.9s linear infinite;
  }
}

@keyframes route-spin {
  to {
    transform: rotate(360deg);
  }
}

.route-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  max-height: 360px;
  overflow-y: auto;
  @include scrollbar;
}

.route-item {
  padding: $spacing-sm $spacing-md;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  background: $bg-glass;
  transition: border-color $transition-base;

  &:hover {
    border-color: $primary-color;
  }

  &.is-open {
    border-color: $primary-color;
    background: rgba($primary-color, 0.04);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    width: 100%;
    // button 重置
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: color $transition-base;

    &:hover {
      .route-item__duration {
        text-decoration: underline;
      }
    }
  }

  &__arrow {
    margin-left: auto;
    color: $text-light;
    flex-shrink: 0;
    transition: transform $transition-base;

    &.is-open {
      transform: rotate(180deg);
    }
  }

  &__index {
    font-size: $font-size-xs;
    color: $text-secondary;
    font-weight: 600;
  }

  &__duration {
    font-size: $font-size-md;
    font-weight: 600;
    color: $primary-color;
  }

  &__distance {
    font-size: $font-size-xs;
    color: $text-light;
    margin-left: auto;
  }

  &__summary {
    margin: $spacing-xs 0 0;
    font-size: $font-size-sm;
    color: $text-primary;
    line-height: 1.5;
    // ponytail: 概要是核心信息（几号线/几路公交），加点字重突出
    font-weight: 500;
  }
}

.route-segs {
  list-style: none;
  margin: $spacing-sm 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.route-seg {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-xs 0;

  // ponytail: 左侧连接线，营造「路线时间轴」感
  &:not(:last-child) {
    border-left: 2px dashed $border-glass;
    margin-left: 11px;
    padding-left: $spacing-sm - 2px;
  }

  &__badge {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    padding: 2px 6px;
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    font-weight: 600;
    color: #fff;
    background: $text-light;

    &--walk { background: #909399; }
    &--subway { background: #409eff; }
    &--bus { background: #67c23a; }
    &--drive { background: #e6a23c; }
    &--ride { background: #9254de; }
    &--other { background: #73767a; }
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: $font-size-sm;
    color: $text-primary;
    line-height: 1.4;
    word-break: break-all;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0 $spacing-sm;
    margin-top: 2px;
    font-size: $font-size-xs;
    color: $text-light;
  }
}
</style>
