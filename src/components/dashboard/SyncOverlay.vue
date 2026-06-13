<template>
  <div class="sync-overlay" v-if="isLocked">
    <div class="sync-overlay__backdrop" />
    <div class="sync-overlay__card">
      <div class="sync-overlay__spinner">
        <NSpin :size="40" />
      </div>
      <p class="sync-overlay__message">{{ lockMessage || '正在同步数据...' }}</p>
      <div v-if="syncPercent > 0" class="sync-overlay__progress">
        <div class="sync-overlay__progress-bar" :style="{ width: syncPercent + '%' }" />
      </div>
      <p v-if="syncPercent > 0" class="sync-overlay__percent">{{ syncPercent }}%</p>
      <p class="sync-overlay__warning">
        <Icon icon="mdi:alert-outline" :width="14" />
        请勿关闭页面，同步完成前所有编辑操作已暂停
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NSpin } from 'naive-ui'
import { useSyncLock } from '@/composables/useSyncLock'

const { isLocked, lockMessage, syncPercent } = useSyncLock()
</script>

<style lang="scss" scoped>
.sync-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: var(--overlay-bg);
  }

  &__card {
    position: relative;
    z-index: 1;
    background: var(--card-overlay-bg);
    border: 1px solid $border-glass;
    border-radius: $radius-xl;
    padding: $spacing-2xl $spacing-2xl;
    min-width: 320px;
    max-width: 420px;
    text-align: center;
    box-shadow: var(--shadow-card);
  }

  &__spinner {
    margin-bottom: $spacing-lg;
  }

  &__message {
    font-size: $font-size-md;
    color: $text-primary;
    margin-bottom: $spacing-md;
    line-height: 1.5;
  }

  &__progress {
    width: 100%;
    height: 6px;
    background: var(--progress-track);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: $spacing-xs;
  }

  &__progress-bar {
    height: 100%;
    background: $primary-bg-active;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  &__percent {
    font-size: $font-size-sm;
    color: $text-light;
    margin-bottom: $spacing-md;
  }

  &__warning {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: $font-size-xs;
    color: $warning-color;
    opacity: 0.9;
  }
}
</style>
