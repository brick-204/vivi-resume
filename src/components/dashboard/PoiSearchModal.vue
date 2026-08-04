<template>
  <n-modal
    :show="visible"
    preset="card"
    :auto-focus="false"
    :style="{ maxWidth: '560px', width: '90vw' }"
    @update:show="(v: boolean) => { if (!v) emit('close') }"
  >
    <template #header>
      <div class="poi-header">
        <Icon icon="mdi:map-search-outline" :width="20" />
        <span>搜索地点</span>
      </div>
    </template>

    <div class="poi-search">
      <NInput
        v-model:value="keyword"
        placeholder="输入公司/大厦/地名，如：中关村、XX 大厦"
        clearable
        @keydown.enter="doSearch"
      />
      <NButton type="primary" :loading="loading" @click="doSearch">
        <Icon icon="mdi:magnify" :width="18" />
        搜索
      </NButton>
    </div>

    <!-- 搜索历史（仅足迹 tab 的搜索位置弹窗显示）：点击即用，hover 可删 -->
    <div v-if="showHistory && history.length > 0" class="poi-history">
      <div class="poi-history__head">
        <span class="poi-history__title">搜索历史</span>
        <NButton size="tiny" quaternary title="清空历史" @click="onClearHistory">
          <Icon icon="mdi:trash-can-outline" :width="14" />
        </NButton>
      </div>
      <div class="poi-history__chips">
        <button
          v-for="h in history"
          :key="`${h.lng},${h.lat}`"
          type="button"
          class="poi-history__chip"
          :title="`${h.name}${h.address ? ' · ' + h.address : ''}`"
          @click="onSelect({ name: h.name, address: h.address, lng: h.lng, lat: h.lat })"
        >
          <Icon icon="mdi:map-marker" :width="13" />
          <span class="poi-history__chip-name">{{ h.name }}</span>
          <span class="poi-history__chip-del" title="删除" @click.stop="onRemoveHistory(h)">
            <Icon icon="mdi:close" :width="13" />
          </span>
        </button>
      </div>
    </div>

    <div class="poi-result">
      <p v-if="errorMsg" class="poi-result__error">
        <Icon icon="mdi:alert-circle-outline" :width="16" />
        {{ errorMsg }}
      </p>
      <p v-else-if="searched && results.length === 0" class="poi-result__empty">
        <Icon icon="mdi:map-marker-off-outline" :width="16" />
        没有找到相关地点，换个关键词试试
      </p>
      <ul v-else class="poi-list">
        <li
          v-for="(poi, idx) in results"
          :key="idx"
          class="poi-list__item"
          @click="onSelect(poi)"
        >
          <Icon icon="mdi:map-marker" :width="18" class="poi-list__icon" />
          <div class="poi-list__body">
            <div class="poi-list__name">{{ poi.name }}</div>
            <div class="poi-list__addr">{{ poi.address }}</div>
          </div>
        </li>
      </ul>
    </div>

    <template #action>
      <NButton @click="emit('close')">取消</NButton>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NInput, NButton } from 'naive-ui'
import { searchPoi, type PoiResult } from '@/services/amapService'
import { useSettingsStore } from '@/stores/settingsStore'
import type { MapLocationItem } from '@/utils/storageAdapter'

const props = defineProps<{
  visible: boolean
  /** 限定城市范围（可选），如「北京」 */
  city?: string
  /** 是否显示搜索历史（仅足迹 tab 的搜索位置弹窗用 true） */
  showHistory?: boolean
}>()

const emit = defineEmits<{
  close: []
  /** 选中一个 POI，把名称/地址/经纬度回传给父组件 */
  select: [poi: PoiResult]
}>()

const settingsStore = useSettingsStore()
const keyword = ref('')
const results = ref<PoiResult[]>([])
const loading = ref(false)
const searched = ref(false)
const errorMsg = ref('')
// 搜索历史（仅 showHistory=true 时显示）
const history = computed(() => (props.showHistory ? settingsStore.mapLocationHistory : []))

const onRemoveHistory = (h: MapLocationItem) => {
  settingsStore.removeMapLocationHistory(h)
}
const onClearHistory = () => {
  settingsStore.clearMapLocationHistory()
}

const doSearch = async () => {
  if (!keyword.value.trim()) return
  if (!settingsStore.amapKey) {
    errorMsg.value = '请先在设置中配置高德地图 Key'
    return
  }
  loading.value = true
  errorMsg.value = ''
  searched.value = true
  try {
    results.value = await searchPoi(
      keyword.value.trim(),
      undefined,
      settingsStore.amapKey,
      settingsStore.amapSecurityCode,
    )
  } catch (e) {
    results.value = []
    errorMsg.value = e instanceof Error ? e.message : '搜索失败'
  } finally {
    loading.value = false
  }
}

const onSelect = (poi: PoiResult) => {
  emit('select', poi)
  emit('close')
}
</script>

<style lang="scss" scoped>
.poi-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.poi-search {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.poi-result {
  min-height: 120px;
  max-height: 360px;
  overflow-y: auto;

  &__error,
  &__empty {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    justify-content: center;
    color: $text-secondary;
    font-size: $font-size-sm;
    padding: $spacing-lg 0;
  }

  &__error {
    color: $error-color;
  }
}

.poi-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  &__item {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-base;
    color: $text-primary;

    &:hover {
      border-color: $primary-color;
      background: rgba($primary-color, 0.08);
    }
  }

  &__icon {
    color: $primary-color;
    flex-shrink: 0;
    margin-top: 2px;
  }

  &__name {
    font-weight: 500;
    font-size: $font-size-sm;
  }

  &__addr {
    font-size: $font-size-xs;
    color: $text-light;
    margin-top: 2px;
  }
}

.poi-history {
  margin-top: $spacing-sm;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid $border-glass;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xs;
  }

  &__title {
    font-size: $font-size-xs;
    color: $text-secondary;
    font-weight: 600;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    border: 1px solid $border-glass;
    border-radius: 12px;
    background: $bg-glass;
    cursor: pointer;
    font-size: $font-size-xs;
    color: $text-primary;
    transition: all $transition-base;
    font-family: inherit;

    &:hover {
      border-color: $primary-color;
      background: rgba($primary-color, 0.08);
    }
  }

  &__chip-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chip-del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 2px;
    border-radius: 50%;
    color: $text-light;
    cursor: pointer;

    &:hover {
      color: $error-color;
      background: rgba($error-color, 0.1);
    }
  }
}
</style>
