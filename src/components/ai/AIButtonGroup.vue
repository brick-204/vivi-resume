<template>
  <div class="ai-button-group">
    <button
      v-for="op in operations"
      :key="op.id"
      class="ai-btn"
      :class="{ 'ai-btn--loading': currentOperation === op.id }"
      :disabled="disabled || !hasActiveConfig"
      :title="hasActiveConfig ? op.label : '请先配置 AI 服务'"
      @click="$emit('operation', op.id)"
    >
      <NSpin v-if="currentOperation === op.id" :size="14" />
      <Icon v-else :icon="op.icon" :width="14" />
      <span class="ai-btn__label">{{ op.label }}</span>
    </button>
    <n-popover v-if="!hasActiveConfig" trigger="hover" placement="top">
      <template #trigger>
        <button class="ai-btn ai-btn--warning" @click="$emit('go-settings')">
          <Icon icon="mdi:alert-circle-outline" :width="14" />
          <span class="ai-btn__label">未配置</span>
        </button>
      </template>
      请先在「AI 服务」中配置 API
    </n-popover>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NPopover, NSpin } from 'naive-ui'
import { AI_OPERATIONS, type AIOperation } from '@/types/aiConfig'

defineProps<{
  currentOperation: AIOperation | null
  hasActiveConfig: boolean
  disabled?: boolean
}>()

defineEmits<{
  operation: [value: AIOperation]
  'go-settings': []
}>()

const operations = AI_OPERATIONS
</script>

<style lang="scss" scoped>
.ai-button-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: $spacing-xs $spacing-sm;
  background: rgba($primary-color, 0.04);
  border-bottom: 1px solid $border-glass;
  flex-shrink: 0;
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border: none;
  background: transparent;
  color: $text-secondary;
  border-radius: $radius-md;
  cursor: pointer;
  font-size: $font-size-xs;
  font-family: $font-family;
  transition: all $transition-fast;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba($primary-color, 0.12);
    color: $primary-light;
  }

  &--loading {
    color: $primary-light;
  }

  &--warning {
    color: $warning-color;

    &:hover {
      background: rgba($warning-color, 0.12);
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &__label {
    line-height: 1;
  }
}
</style>
