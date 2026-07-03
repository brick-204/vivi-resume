<template>
  <n-modal
    :show="visible"
    preset="card"
    :style="{ width: '700px', maxWidth: '90vw' }"
    :mask-closable="false"
    :close-on-esc="false"
    @update:show="v => { if (!v) handleCancel() }"
  >
    <template #header>
      <div class="modal-header">
        <h3 class="modal-title">{{ sectionLabel }} 合并冲突</h3>
        <p class="modal-subtitle">请选择如何处理以下字段</p>
      </div>
    </template>

    <div class="conflict-list">
      <div v-for="conflict in localConflicts" :key="conflict.key" class="conflict-field">
        <label class="field-label">{{ conflict.label }}</label>

        <!-- 三选一 -->
        <n-radio-group v-model:value="conflict.choice" class="field-options">
          <div class="option-row">
            <n-radio value="current">
              <span class="option-label">保留当前</span>
            </n-radio>
            <n-radio value="trash">
              <span class="option-label">使用回收箱</span>
            </n-radio>
            <n-radio value="merged">
              <span class="option-label">合并</span>
            </n-radio>
          </div>
        </n-radio-group>

        <!-- 预览框 -->
        <div class="preview-area">
          <div v-if="conflict.choice === 'current'" class="preview-box preview-current">
            <div class="preview-tag">当前</div>
            <pre class="preview-text">{{ conflict.existingValue || '(空)' }}</pre>
          </div>

          <div v-else-if="conflict.choice === 'trash'" class="preview-box preview-trash">
            <div class="preview-tag">回收箱</div>
            <pre class="preview-text">{{ conflict.trashValue || '(空)' }}</pre>
          </div>

          <div v-else class="preview-box preview-merged">
            <div class="preview-tag">合并结果（可编辑）</div>
            <n-input
              v-model:value="conflict.mergedValue"
              type="textarea"
              :rows="3"
              placeholder="可编辑合并结果"
              class="merge-input"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="handleCancel">取消</n-button>
        <n-button type="primary" @click="handleOk">应用合并</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NRadioGroup, NRadio, NButton, NInput } from 'naive-ui'
import type { FieldConflict } from '@/types/resume'

interface Props {
  visible: boolean
  sectionId: string
  sectionLabel: string
  conflicts: FieldConflict[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'ok', conflicts: FieldConflict[]): void
  (e: 'cancel'): void
}>()

// 本地编辑状态（深拷贝避免直接修改 props）
const localConflicts = ref<FieldConflict[]>([])

watch(() => props.conflicts, (newConflicts) => {
  localConflicts.value = newConflicts.map(c => ({ ...c }))
}, { immediate: true, deep: true })

const handleOk = () => {
  emit('ok', localConflicts.value)
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.modal-header {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.modal-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $text-primary;
  margin: 0;
}

.modal-subtitle {
  font-size: $font-size-sm;
  color: $text-secondary;
  margin: 0;
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.conflict-field {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.field-label {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.field-options {
  .option-row {
    display: flex;
    gap: $spacing-lg;
  }

  .option-label {
    font-size: $font-size-sm;
    color: $text-primary;
  }
}

.preview-area {
  margin-top: $spacing-xs;
}

.preview-box {
  padding: $spacing-sm;
  border-radius: $radius-md;
  background: var(--bg-glass);
  border: 1px solid $border-glass;

  &.preview-current {
    border-left: 3px solid $primary-color;
  }

  &.preview-trash {
    border-left: 3px solid $warning-color;
  }

  &.preview-merged {
    border-left: 3px solid $success-color;
  }
}

.preview-tag {
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: $text-secondary;
  margin-bottom: $spacing-xs;
}

.preview-text {
  font-size: $font-size-sm;
  color: $text-primary;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 150px;
  overflow-y: auto;
  @include scrollbar;
}

.merge-input {
  :deep(textarea) {
    font-family: inherit;
    font-size: $font-size-sm;
  }
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: $spacing-md;
}
</style>