<template>
  <div v-if="pageBreaks.length > 0" class="page-break-indicators">
    <div
      v-for="breakInfo in pageBreaks"
      :key="breakInfo.pageNumber"
      class="page-break-indicator"
      :style="{ top: `${breakInfo.topPosition}px` }"
    >
      <div class="page-break-indicator__line"></div>
      <div class="page-break-indicator__badge">
        <Icon icon="mdi:file-document-outline" width="12" height="12" />
        <span>{{ breakInfo.pageNumber }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { PageBreak } from '@/composables/usePageBreaks'

defineProps<{
  pageBreaks: PageBreak[]
}>()
</script>

<style lang="scss" scoped>
.page-break-indicators {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 10;
}

.page-break-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;

  &__line {
    position: absolute;
    left: 0;
    right: 50px;
    top: 0;
    border-top: 1px dashed #d1d5db;
  }

  &__badge {
    position: absolute;
    right: 0;
    top: -9px;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
    color: #6b7280;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
  }
}
</style>
