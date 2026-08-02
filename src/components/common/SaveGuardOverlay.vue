<template>
  <!--
    ponytail: 落盘兜底全屏遮罩。
    - useFlushGuard.isFlushing 驱动；beforeunload 弹原生框后用户点「留下」、或 visibilitychange/pagehide flush 期间显示
    - z-index 10000（高于 app-shell 9999 / 路由骨架 9998 / 桌宠 / 抽屉）
    - 不确定转圈，落盘完成由父组件置 visible=false 自动消失
  -->
  <Transition name="save-guard-fade">
    <div v-if="visible" class="save-guard-overlay" role="status" aria-live="polite">
      <div class="save-guard-card">
        <n-spin size="large" />
        <p class="save-guard-text">正在保存，请勿关闭或刷新…</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { NSpin } from 'naive-ui'

defineProps<{
  visible: boolean
}>()
</script>

<style lang="scss" scoped>
.save-guard-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.save-guard-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 36px 48px;
  border-radius: 16px;
  background: $bg-primary;
  // ponytail: 半透明遮罩 + blur 上卡片需显式 border 提升层次，浅色主题下避免白卡糊在浅遮罩中
  border: 1px solid $border-color;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.save-guard-text {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: $text-primary;
}

.save-guard-fade-enter-active,
.save-guard-fade-leave-active {
  transition: opacity 0.18s ease;
}
.save-guard-fade-enter-from,
.save-guard-fade-leave-to {
  opacity: 0;
}
</style>
