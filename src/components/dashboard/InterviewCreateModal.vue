<template>
  <n-modal
    :show="visible"
    preset="card"
    :style="{ maxWidth: '480px', width: '90vw' }"
    @update:show="(v: boolean) => { if (!v) emit('close') }"
  >
    <template #header>
      <div class="create-header">
        <Icon icon="mdi:plus-circle-outline" :width="20" />
        <span>新建面试</span>
      </div>
    </template>

    <div class="create-options">
      <button
        v-for="opt in options"
        :key="opt.mode"
        type="button"
        class="create-option"
        @click="emit('create', opt.mode)"
      >
        <Icon :icon="opt.icon" :width="28" />
        <span class="create-option__title">{{ opt.title }}</span>
        <span class="create-option__desc">{{ opt.desc }}</span>
      </button>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NModal } from 'naive-ui'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  create: [mode: 'hand' | 'jd']
}>()

const options: { mode: 'hand' | 'jd'; icon: string; title: string; desc: string }[] = [
  { mode: 'hand', icon: 'mdi:pencil-plus', title: '手动新建', desc: '从空白表单开始填写' },
  { mode: 'jd', icon: 'mdi:robot-outline', title: 'AI 解析 JD', desc: '粘贴职位描述，AI 自动提取信息' },
]
</script>

<style lang="scss" scoped>
.create-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.create-options {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.create-option {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  background: $bg-glass;
  cursor: pointer;
  transition: all $transition-base;
  text-align: left;
  color: $text-primary;
  width: 100%;
  font-family: inherit;

  &:hover {
    border-color: $primary-color;
    background: rgba($primary-color, 0.08);
    transform: translateY(-1px);
  }

  &__title {
    font-weight: 600;
    font-size: $font-size-md;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-light;
    margin-left: auto;
  }
}
</style>
