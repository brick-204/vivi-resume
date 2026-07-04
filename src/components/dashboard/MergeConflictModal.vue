<template>
  <!-- ponytail: 外层 naiveDialog 已提供 modal 外壳（mask/title/focus-trap），这里只放内容，避免嵌套 FocusTrap 的 sentinel 落在 aria-hidden 范围内触发 a11y 警告 -->
  <div class="merge-conflict-content">
    <n-alert type="info" class="conflict-hint">
      目录中有 {{ conflicts.length }} 项数据与 IndexedDB 数据 ID 重复，请逐项选择处理方式。
    </n-alert>

    <n-tabs v-model:value="activeTab" type="line" class="conflict-tabs" display-directives="show">
      <n-tab-pane v-if="resumeConflicts.length" name="resume" :tab="`简历 (${resumeConflicts.length})`">
        <div class="conflict-list">
          <div v-for="c in resumeConflicts" :key="c.key" class="conflict-item">
            <div class="conflict-item-content">
              <div class="content-card content-card--idb">
                <div class="card-header">
                  <Icon icon="mdi:database" :width="14" />
                  <span class="card-label">IndexedDB</span>
                </div>
                <strong>{{ c.idbVersion.title || '未命名' }}</strong>
                <p class="card-extra">修改于 {{ formatTimestamp(c.idbVersion.updatedAt) }}</p>
              </div>
              <div class="content-card content-card--dir">
                <div class="card-header">
                  <Icon icon="mdi:folder-open" :width="14" />
                  <span class="card-label">目录版本</span>
                </div>
                <strong>{{ c.dirVersion.title || '未命名' }}</strong>
                <p class="card-extra">修改于 {{ formatTimestamp(c.dirVersion.updatedAt) }}</p>
              </div>
            </div>
            <n-radio-group
              v-model:value="choices[c.key]"
              class="conflict-item-actions"
              name="merge-choice"
            >
              <n-radio value="idb">保留 IndexedDB</n-radio>
              <n-radio value="dir">保留目录</n-radio>
              <n-radio value="both">两个都要</n-radio>
            </n-radio-group>
          </div>
        </div>
      </n-tab-pane>
      <n-tab-pane v-if="aiConfigConflicts.length" name="aiConfig" :tab="`AI 配置 (${aiConfigConflicts.length})`">
        <div class="conflict-list">
          <div v-for="c in aiConfigConflicts" :key="c.key" class="conflict-item">
            <div class="conflict-item-content">
              <div class="content-card content-card--idb">
                <div class="card-header">
                  <Icon icon="mdi:database" :width="14" />
                  <span class="card-label">IndexedDB</span>
                </div>
                <strong>{{ c.idbVersion.title || '未命名' }}</strong>
                <p v-if="c.idbVersion.subtitle" class="card-subtitle">{{ c.idbVersion.subtitle }}</p>
                <p class="card-extra">修改于 {{ formatTimestamp(c.idbVersion.updatedAt) }}</p>
              </div>
              <div class="content-card content-card--dir">
                <div class="card-header">
                  <Icon icon="mdi:folder-open" :width="14" />
                  <span class="card-label">目录版本</span>
                </div>
                <strong>{{ c.dirVersion.title || '未命名' }}</strong>
                <p v-if="c.dirVersion.subtitle" class="card-subtitle">{{ c.dirVersion.subtitle }}</p>
                <p class="card-extra">修改于 {{ formatTimestamp(c.dirVersion.updatedAt) }}</p>
              </div>
            </div>
            <n-radio-group
              v-model:value="choices[c.key]"
              class="conflict-item-actions"
              name="merge-choice"
            >
              <n-radio value="idb">保留 IndexedDB</n-radio>
              <n-radio value="dir">保留目录</n-radio>
              <n-radio value="both">两个都要</n-radio>
            </n-radio-group>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>

    <div v-if="conflicts.length > 1" class="quick-actions">
      <n-button size="small" quaternary @click="applyQuickChoice('idb')">全选 IndexedDB</n-button>
      <n-button size="small" quaternary @click="applyQuickChoice('dir')">全选目录</n-button>
      <n-button size="small" quaternary @click="applyQuickChoice('both')">全选两个都要</n-button>
    </div>

    <div class="modal-actions">
      <button class="action-btn action-btn--ghost" @click="handleCancel">取消</button>
      <button
        class="action-btn action-btn--primary"
        :disabled="!hasValidChoices"
        @click="handleConfirm"
      >
        确认处理
      </button>
    </div>
  </div>
</template>

<script lang="ts">
// ponytail: 通用冲突项类型，简历与 AI 配置共用，由 store 构造后传入
export interface ConflictVersion {
  title: string
  subtitle?: string
  updatedAt?: string
}

export interface ConflictItem {
  key: string
  type: 'resume' | 'aiConfig'
  typeLabel: string
  idbVersion: ConflictVersion
  dirVersion: ConflictVersion
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NTabs, NTabPane, NRadioGroup, NRadio, NButton, NAlert } from 'naive-ui'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  conflicts: ConflictItem[]
}>()

const emit = defineEmits<{
  close: []
  merge: [choices: Record<string, 'idb' | 'dir' | 'both'>]
}>()

// ponytail: 单一 choices 对象，key = 冲突项 key（resume:{id} / aiConfig:{id}），value = 三选一，跨 tab 共享
const choices = ref<Record<string, 'idb' | 'dir' | 'both'>>({})

const resumeConflicts = computed(() => props.conflicts.filter(c => c.type === 'resume'))
const aiConfigConflicts = computed(() => props.conflicts.filter(c => c.type === 'aiConfig'))
const activeTab = ref<'resume' | 'aiConfig'>(resumeConflicts.value.length > 0 ? 'resume' : 'aiConfig')

const hasValidChoices = computed(() =>
  props.conflicts.length > 0 &&
  props.conflicts.every(c => c.key in choices.value),
)

const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return '-'
  try {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return timestamp
  }
}

const applyQuickChoice = (choice: 'idb' | 'dir' | 'both') => {
  for (const c of props.conflicts) {
    choices.value[c.key] = choice
  }
}

const handleCancel = () => {
  choices.value = {}
  emit('close')
}

const handleConfirm = () => {
  if (hasValidChoices.value) {
    emit('merge', { ...choices.value })
    choices.value = {}
  }
}
</script>

<style lang="scss" scoped>
.conflict-hint {
  margin-bottom: $spacing-md;
}

.conflict-tabs {
  margin-bottom: $spacing-sm;
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  max-height: 50vh;
  overflow-y: auto;
  padding-right: $spacing-xs;
}

.conflict-item {
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  padding: $spacing-md;
  background: rgba($bg-glass, 0.5);
}

.conflict-item-content {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-sm;
  flex: 1;

  &--idb {
    background: rgba($primary-color, 0.08);
    border: 1px solid rgba($primary-color, 0.15);
  }

  &--dir {
    background: rgba($success-color, 0.08);
    border: 1px solid rgba($success-color, 0.15);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-xs;
  color: var(--text-secondary);
}

.card-label {
  font-weight: 600;
}

.card-subtitle {
  font-size: $font-size-xs;
  color: var(--text-secondary);
  margin: 0;
}

.card-extra {
  font-size: $font-size-xs;
  color: var(--text-secondary);
  margin: 0;
}

.conflict-item-actions {
  display: flex;
  justify-content: center;
}

.quick-actions {
  display: flex;
  gap: $spacing-sm;
  justify-content: center;
  margin-top: $spacing-md;
}

.modal-actions {
  display: flex;
  gap: $spacing-sm;
  justify-content: center;
  width: 100%;
  margin-top: $spacing-md;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: 1px solid transparent;
  font-family: $font-family;

  &--primary {
    background: $primary-color;
    color: #fff;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

    &:hover:not(:disabled) {
      background: $primary-light;
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }
  }

  &--ghost {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
    border-color: var(--border-glass);

    &:hover {
      background: var(--bg-glass-active);
      border-color: var(--border-hover);
    }
  }
}
</style>
