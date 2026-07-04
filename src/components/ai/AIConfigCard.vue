<template>
  <div
    class="ai-config-card"
    :class="{
      'ai-config-card--active': isActive,
      'ai-config-card--selectable': selectable,
      'ai-config-card--selected': selected,
    }"
    @click="onCardClick"
  >
    <!-- 选择态复选框 -->
    <div v-if="selectable" class="card__checkbox" :class="{ 'is-checked': selected }">
      <Icon v-if="selected" icon="mdi:check" :width="16" />
    </div>
    <div class="card__header">
      <div class="card__info">
        <span class="card__name">{{ config.name }}</span>
        <n-tag size="small" :type="isActive ? 'success' : 'default'" :bordered="false">
          {{ providerName }}
        </n-tag>
      </div>
      <div v-if="!selectable" class="card__actions">
        <button v-if="isActive" class="action-btn action-btn--deactivate" title="停用" @click="$emit('deactivate')">
          <Icon icon="mdi:close-circle-outline" :width="16" />
          <span>停用</span>
        </button>
        <button v-else class="action-btn action-btn--activate" title="启用" @click="$emit('set-active')">
          <Icon icon="mdi:check-circle-outline" :width="16" />
          <span>启用</span>
        </button>
        <button class="action-btn" title="编辑" @click="$emit('edit')">
          <Icon icon="mdi:pencil-outline" :width="16" />
        </button>
        <button class="action-btn" title="复制" @click="$emit('copy')">
          <Icon icon="mdi:content-copy" :width="16" />
        </button>
        <n-popconfirm @positive-click="$emit('delete')">
          <template #trigger>
            <button class="action-btn action-btn--danger" title="删除" @click.stop>
              <Icon icon="mdi:delete-outline" :width="16" />
            </button>
          </template>
          确定删除「{{ config.name }}」配置吗？
        </n-popconfirm>
      </div>
    </div>
    <div class="card__details">
      <span class="detail__item">
        <Icon icon="mdi:cube-outline" :width="14" />
        {{ config.modelId }}
      </span>
      <span class="detail__item">
        <Icon icon="mdi:link-variant" :width="14" />
        {{ truncateEndpoint(config.endpoint) }}
      </span>
      <span class="detail__item" :class="config.apiKey ? 'detail__item--ok' : 'detail__item--warn'">
        <Icon :icon="config.apiKey ? 'mdi:key-outline' : 'mdi:key-alert-outline'" :width="14" />
        {{ config.apiKey ? maskApiKey(config.apiKey) : '未配置密钥' }}
      </span>
    </div>
    <div v-if="isActive" class="card__active-badge">
      <Icon icon="mdi:check-circle" :width="14" />
      当前使用
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { NTag, NPopconfirm } from 'naive-ui'
import type { AIServiceConfig } from '@/types/aiConfig'
import { getProviderInfo } from '@/types/aiConfig'

const props = defineProps<{
  config: AIServiceConfig
  isActive: boolean
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  edit: []
  copy: []
  delete: []
  'set-active': []
  deactivate: []
  'toggle-select': []
}>()

const onCardClick = () => {
  if (props.selectable) {
    emit('toggle-select')
  }
}

const providerName = computed(() => {
  const info = getProviderInfo(props.config.provider)
  return info?.name || props.config.provider
})

const truncateEndpoint = (url: string) => {
  if (!url) return '-'
  if (url.length <= 40) return url
  return url.substring(0, 37) + '...'
}

const maskApiKey = (key: string): string => {
  if (!key) return ''
  if (key.length <= 8) return '***'
  return key.slice(0, 3) + '...' + key.slice(-4)
}
</script>

<style lang="scss" scoped>
.ai-config-card {
  @include glass-card;
  position: relative;
  padding: $spacing-md;
  border: 1px solid $border-glass;
  transition: all $transition-base;

  &:hover {
    border-color: rgba($primary-color, 0.3);
  }

  &--active {
    border-color: rgba($primary-color, 0.5);
    box-shadow: 0 0 0 1px rgba($primary-color, 0.2), $shadow-primary;
  }

  &--selectable {
    cursor: pointer;
  }

  &--selected {
    border-color: $primary-color;
    box-shadow: 0 0 0 2px rgba($primary-color, 0.4);
  }
}

.card__checkbox {
  position: absolute;
  top: $spacing-sm;
  left: $spacing-sm;
  width: 24px;
  height: 24px;
  border-radius: $radius-sm;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  z-index: 3;
  transition: all 0.15s ease;

  &.is-checked {
    background: $primary-color;
    border-color: $primary-color;
  }
}

.card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.card__info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  min-width: 0;
}

.card__name {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: $text-secondary;
  border-radius: $radius-md;
  cursor: pointer;
  font-size: $font-size-xs;
  font-family: $font-family;
  transition: all $transition-fast;
  white-space: nowrap;

  &:hover {
    background: $bg-glass;
    color: $text-primary;
  }

  &--activate {
    color: $success-color;

    &:hover {
      background: rgba($success-color, 0.1);
      color: $success-color;
    }
  }

  &--deactivate {
    color: $text-light;

    &:hover {
      background: rgba($text-light, 0.15);
      color: $text-secondary;
    }
  }

  &--danger {
    &:hover {
      background: rgba($error-color, 0.1);
      color: $error-color;
    }
  }
}

.card__details {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-md;
}

.detail__item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: $font-size-xs;
  color: $text-light;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &--ok {
    color: $success-color;
  }

  &--warn {
    color: $warning-color;
  }
}

.card__active-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 1px solid $border-glass;
  font-size: $font-size-xs;
  font-weight: 500;
  color: $success-color;
}
</style>
