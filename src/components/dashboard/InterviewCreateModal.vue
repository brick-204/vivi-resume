<template>
  <n-modal
    :show="visible"
    preset="card"
    :auto-focus="false"
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
        ref="optionBtnRefs"
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
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal } from 'naive-ui'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  create: [mode: 'hand' | 'jd']
}>()

// ponytail: preset="card" 无默认 action 按钮，auto-focus 找不到目标会留焦在触发按钮上，
// 此时背景被 naive 加 aria-hidden → a11y 警告。打开后手动把焦点移进 modal 第一个选项。
const optionBtnRefs = ref<HTMLButtonElement[]>([])
watch(() => props.visible, async (v) => {
  if (!v) return
  await nextTick()
  optionBtnRefs.value[0]?.focus()
})

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
