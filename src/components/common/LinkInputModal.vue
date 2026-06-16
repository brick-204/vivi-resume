<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ maxWidth: '420px', width: '90vw' }"
    :mask-closable="true"
    @update:show="v => { if (!v) emit('close') }"
  >
    <template #header>
      <div class="link-modal-header">
        <Icon icon="mdi:link-variant" :width="18" />
        <span>{{ initialUrl ? '编辑链接' : '添加链接' }}</span>
      </div>
    </template>

    <n-input
      ref="inputRef"
      v-model:value="url"
      placeholder="请输入链接地址，如 https://example.com 或 example.com"
      clearable
      @keydown.enter="handleConfirm"
    />

    <template #footer>
      <div class="link-modal-footer">
        <n-button v-if="initialUrl" size="small" @click="handleRemove">
          移除链接
        </n-button>
        <div class="link-modal-footer__right">
          <n-button size="small" @click="emit('close')">取消</n-button>
          <n-button type="primary" size="small" :disabled="!url.trim()" @click="handleConfirm">
            确认
          </n-button>
        </div>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NInput, NButton } from 'naive-ui'

const props = defineProps<{
  show: boolean
  initialUrl?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [url: string]
  remove: []
}>()

const url = ref('')
const inputRef = ref<InstanceType<typeof NInput>>()

// 打开时初始化
watch(() => props.show, (val) => {
  if (val) {
    url.value = props.initialUrl || ''
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

const handleConfirm = () => {
  const trimmed = url.value.trim()
  if (!trimmed) return

  // 基础 URL 校验：允许 http/https/mailto 协议，无协议时自动补 https://
  let finalUrl = trimmed
  if (!/^https?:\/\//i.test(finalUrl) && !/^mailto:/i.test(finalUrl)) {
    // 检查是否像域名（含点号且无空格）
    if (/^[^\s]+\.[^\s]+/.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`
    } else {
      // 尝试用 URL 构造函数验证
      try {
        new URL(`https://${finalUrl}`)
        finalUrl = `https://${finalUrl}`
      } catch {
        // 不像合法 URL，仍然允许（用户可能输入相对路径等）
      }
    }
  }

  emit('confirm', finalUrl)
}

const handleRemove = () => {
  emit('remove')
}
</script>

<style lang="scss" scoped>
.link-modal-header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-weight: 600;
  @include gradient-text;
}

.link-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__right {
    display: flex;
    gap: $spacing-xs;
    margin-left: auto;
  }
}
</style>
