<template>
  <div class="trash-panel">
    <!-- 顶部标题 -->
    <div class="trash-panel__header">
      <h2 class="trash-panel__title">
        <Icon icon="mdi:delete-outline" :width="24" />
        回收站
        <span v-if="trashCount > 0" class="trash-panel__count">{{ trashCount }}</span>
      </h2>
      <div class="trash-panel__actions">
        <button
          v-if="trashCount > 0"
          class="empty-trash-btn"
          @click="handleEmptyTrash"
        >
          <Icon icon="mdi:delete-forever" :width="18" />
          清空回收站
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="trashCount === 0" class="trash-panel__empty">
      <div class="empty__icon">
        <Icon icon="mdi:delete-off-outline" :width="64" />
      </div>
      <p class="empty__text">回收站是空的</p>
      <p class="empty__hint">删除的简历会在这里保留 {{ store.trashRetentionDays }} 天</p>
    </div>

    <!-- 回收站列表 -->
    <div v-else class="trash-panel__list">
      <div
        v-for="resume in trashWithRemainingDays"
        :key="resume.id"
        class="trash-item"
      >
        <div class="trash-item__info">
          <h3 class="trash-item__title">{{ resume.title }}</h3>
          <p class="trash-item__meta">
            删除于 {{ formatDate(resume.deletedAt) }}
            <span class="trash-item__remaining">剩余 {{ resume.remainingDays }} 天</span>
          </p>
        </div>
        <div class="trash-item__actions">
          <button class="trash-item__btn trash-item__btn--restore" @click="handleRestore(resume.id)">
            <Icon icon="mdi:restore" :width="18" />
            恢复
          </button>
          <button class="trash-item__btn trash-item__btn--delete" @click="handlePermanentDelete(resume.id)">
            <Icon icon="mdi:delete-forever" :width="18" />
            永久删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useResumeStore } from '@/stores/resumeStore'
import { dialog } from '@/plugins/naive-ui'

const store = useResumeStore()

const trashCount = computed(() => store.trash.length)

// 计算剩余天数
const trashWithRemainingDays = computed(() => {
  return store.trash.map(resume => {
    const deletedAt = resume.deletedAt ? new Date(resume.deletedAt).getTime() : Date.now()
    const cutoff = Date.now() + store.trashRetentionDays * 24 * 60 * 60 * 1000
    const remainingMs = cutoff - deletedAt
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
    return { ...resume, remainingDays }
  })
})

// 格式化日期
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '未知'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 恢复简历
const handleRestore = (id: string) => {
  dialog.success({
    title: '恢复简历',
    content: '确定要恢复这个简历吗？',
    positiveText: '恢复',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.restoreResume(id)
    },
  })
}

// 永久删除
const handlePermanentDelete = (id: string) => {
  const resume = store.trash.find(r => r.id === id)
  dialog.warning({
    title: '永久删除',
    content: `确定要永久删除「${resume?.title || '这个简历'}」吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.permanentDeleteResume(id)
    },
  })
}

// 清空回收站
const handleEmptyTrash = () => {
  dialog.warning({
    title: '清空回收站',
    content: `确定要清空回收站吗？这将永久删除 ${trashCount.value} 个简历，此操作不可撤销。`,
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.emptyTrash()
    },
  })
}
</script>

<style lang="scss" scoped>
.trash-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-md $spacing-lg;
    background: var(--bg-glass);
    border-radius: $radius-lg;
    border: 1px solid $border-glass;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $text-primary;
  }

  &__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: rgba($error-color, 0.15);
    color: $error-color;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    border-radius: $radius-full;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-xl * 2;
    color: $text-secondary;

    .empty__icon {
      opacity: 0.5;
      margin-bottom: $spacing-md;
    }

    .empty__text {
      font-size: $font-size-lg;
      margin-bottom: $spacing-xs;
    }

    .empty__hint {
      font-size: $font-size-sm;
      opacity: 0.7;
    }
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-sm;
  }
}

// 清空回收站按钮 - Apple 风格 danger button
.empty-trash-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $error-color;
  font-size: $font-size-sm;
  font-weight: $font-weight-normal;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba($error-color, 0.08);
  }

  &:active {
    transform: scale(0.95);
  }
}

.trash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  background: var(--bg-glass);
  border-radius: $radius-md;
  border: 1px solid $border-glass;
  transition: background 0.15s ease;

  &:hover {
    background: var(--bg-glass-hover);
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    margin-bottom: $spacing-xs;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    font-size: $font-size-sm;
    color: $text-secondary;
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__remaining {
    padding: 2px 6px;
    background: var(--bg-glass-hover);
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    color: $warning-color;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }

  &__btn {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-sm;
    border-radius: $radius-sm;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    border: none;
    background: transparent;
    color: $text-secondary;

    &:hover {
      background: var(--bg-glass-hover);
    }

    &--restore {
      color: $success-color;

      &:hover {
        background: rgba($success-color, 0.1);
      }
    }

    &--delete {
      color: $error-color;

      &:hover {
        background: rgba($error-color, 0.1);
      }
    }
  }
}
</style>