<template>
  <n-modal
    :show="visible"
    preset="card"
    title="导入简历"
    :style="{ maxWidth: '520px', width: '90vw' }"
    :mask-closable="true"
    @update:show="v => !v && $emit('close')"
  >
    <div class="import-method">
      <div class="method-card" tabindex="0" role="button" @click="$emit('select', 'ai')" @keydown.enter="$emit('select', 'ai')" @keydown.space.prevent="$emit('select', 'ai')">
        <div class="method-card__icon">
          <Icon icon="mdi:robot-outline" :width="32" />
        </div>
        <h3 class="method-card__title">AI 智能导入</h3>
        <p class="method-card__desc">支持 .md / .docx / .pdf，AI 自动解析为结构化简历</p>
        <div class="method-card__privacy">
          <Icon icon="mdi:shield-alert-outline" :width="14" />
          <span>文件内容将发送给 AI 服务，请勿包含不希望泄露的敏感信息</span>
        </div>
      </div>

      <div class="method-card" tabindex="0" role="button" @click="$emit('select', 'json')" @keydown.enter="$emit('select', 'json')" @keydown.space.prevent="$emit('select', 'json')">
        <div class="method-card__icon">
          <Icon icon="mdi:code-json" :width="32" />
        </div>
        <h3 class="method-card__title">JSON 导入</h3>
        <p class="method-card__desc">导入 Vivi Resume 导出的 .json 文件</p>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { NModal } from 'naive-ui'
import { Icon } from '@iconify/vue'

defineProps<{ visible: boolean }>()

defineEmits<{
  close: []
  select: [method: 'ai' | 'json']
}>()
</script>

<style lang="scss" scoped>
.import-method {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.method-card {
  @include glass;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xl $spacing-lg;
  cursor: pointer;
  transition: all $transition-base;
  text-align: center;
  outline: none;

  &:hover,
  &:focus-visible {
    @include glass-hover;
    transform: translateY(-2px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px $primary-color;
  }

  &__icon {
    color: $primary-light;
    margin-bottom: $spacing-md;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 $spacing-xs;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin: 0 0 $spacing-md;
  }

  &__privacy {
    @include privacy-notice;
    justify-content: center;
  }
}
</style>
