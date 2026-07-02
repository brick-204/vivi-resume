<template>
  <div class="trash-bin-panel">
    <div class="trash-bin__header">
      <h3 class="trash-bin__title">
        <Icon icon="mdi:delete-restore" :width="20" />
        回收箱
        <span class="trash-bin__hint">（保留 7 天）</span>
      </h3>
      <button v-if="hasDeletedData" class="trash-bin__clear" @click="handleClearAll">
        <Icon icon="mdi:delete-forever" :width="16" />
        清空
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasDeletedData" class="trash-bin__empty">
      <Icon icon="mdi:delete-off-outline" :width="48" />
      <p>暂无已删除的内容</p>
    </div>

    <!-- 列表 -->
    <div v-else class="trash-bin__list">
      <!-- Sections -->
      <div v-if="deletedSectionsList.length > 0" class="trash-bin__group">
        <h4 class="trash-bin__group-title">已删除模块</h4>
        <div v-for="section in deletedSectionsList" :key="section.id" class="trash-bin__item">
          <div class="trash-bin__item-info">
            <span class="trash-bin__item-label">{{ section.label }}</span>
            <span class="trash-bin__item-time">{{ formatTime(section.deletedAt) }}</span>
          </div>
          <div class="trash-bin__item-actions">
            <button class="trash-bin__btn trash-bin__btn--view" @click="handleViewSection(section.id)">
              <Icon icon="mdi:eye-outline" :width="16" />
              查看
            </button>
            <button class="trash-bin__btn trash-bin__btn--restore" @click="handleRestoreSection(section.id)">
              <Icon icon="mdi:restore" :width="16" />
              恢复
            </button>
            <button class="trash-bin__btn trash-bin__btn--delete" @click="handleDeleteSection(section.id)">
              <Icon icon="mdi:delete-forever" :width="16" />
            </button>
          </div>
        </div>
      </div>

      <!-- Cards -->
      <div v-if="deletedCardsList.length > 0" class="trash-bin__group">
        <h4 class="trash-bin__group-title">已删除卡片</h4>
        <div v-for="card in deletedCardsList" :key="card.id" class="trash-bin__item">
          <div class="trash-bin__item-info">
            <span class="trash-bin__item-label">{{ card.label }}</span>
            <span class="trash-bin__item-meta">{{ card.sectionLabel }}</span>
            <span class="trash-bin__item-time">{{ formatTime(card.deletedAt) }}</span>
          </div>
          <div class="trash-bin__item-actions">
            <button class="trash-bin__btn trash-bin__btn--view" @click="handleViewCard(card.sectionId, card.id)">
              <Icon icon="mdi:eye-outline" :width="16" />
              查看
            </button>
            <button class="trash-bin__btn trash-bin__btn--restore" @click="handleRestoreCard(card.sectionId, card.id)">
              <Icon icon="mdi:restore" :width="16" />
              恢复
            </button>
            <button class="trash-bin__btn trash-bin__btn--delete" @click="handleDeleteCard(card.sectionId, card.id)">
              <Icon icon="mdi:delete-forever" :width="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 查看弹窗 -->
    <div v-if="viewingItem" class="trash-bin__modal-overlay" @click="viewingItem = null">
      <div class="trash-bin__modal" @click.stop>
        <div class="trash-bin__modal-header">
          <h4 class="trash-bin__modal-title">{{ viewingItem.title }}</h4>
          <button class="trash-bin__modal-close" @click="viewingItem = null">
            <Icon icon="mdi:close" :width="20" />
          </button>
        </div>
        <div class="trash-bin__modal-body">
          <div v-if="viewingItem.type === 'section'" class="trash-bin__modal-content">
            <div v-for="item in viewingItem.data" :key="item.id" class="trash-bin__modal-item">
              <div v-if="item.company" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">公司：</span>
                <span class="trash-bin__modal-value">{{ item.company }}</span>
              </div>
              <div v-if="item.position" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">职位：</span>
                <span class="trash-bin__modal-value">{{ item.position }}</span>
              </div>
              <div v-if="item.school" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">学校：</span>
                <span class="trash-bin__modal-value">{{ item.school }}</span>
              </div>
              <div v-if="item.degree" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">学位：</span>
                <span class="trash-bin__modal-value">{{ item.degree }}</span>
              </div>
              <div v-if="item.major" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">专业：</span>
                <span class="trash-bin__modal-value">{{ item.major }}</span>
              </div>
              <div v-if="item.name" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">项目：</span>
                <span class="trash-bin__modal-value">{{ item.name }}</span>
              </div>
              <div v-if="item.role" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">角色：</span>
                <span class="trash-bin__modal-value">{{ item.role }}</span>
              </div>
              <div v-if="item.startDate || item.endDate" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">时间：</span>
                <span class="trash-bin__modal-value">{{ item.startDate }} - {{ item.endDate }}</span>
              </div>
              <div v-if="item.description" class="trash-bin__modal-field trash-bin__modal-field--full">
                <span class="trash-bin__modal-label">描述：</span>
                <div class="trash-bin__modal-value trash-bin__modal-html" v-html="sanitizeHtml(item.description)" />
              </div>
            </div>
          </div>
          <div v-else-if="viewingItem.type === 'card'" class="trash-bin__modal-content">
            <div class="trash-bin__modal-item">
              <div v-if="viewingItem.data.company" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">公司：</span>
                <span class="trash-bin__modal-value">{{ viewingItem.data.company }}</span>
              </div>
              <div v-if="viewingItem.data.position" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">职位：</span>
                <span class="trash-bin__modal-value">{{ viewingItem.data.position }}</span>
              </div>
              <div v-if="viewingItem.data.school" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">学校：</span>
                <span class="trash-bin__modal-value">{{ viewingItem.data.school }}</span>
              </div>
              <div v-if="viewingItem.data.degree" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">学位：</span>
                <span class="trash-bin__modal-value">{{ viewingItem.data.degree }}</span>
              </div>
              <div v-if="viewingItem.data.major" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">专业：</span>
                <span class="trash-bin__modal-value">{{ viewingItem.data.major }}</span>
              </div>
              <div v-if="viewingItem.data.name" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">项目：</span>
                <span class="trash-bin__modal-value">{{ viewingItem.data.name }}</span>
              </div>
              <div v-if="viewingItem.data.role" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">角色：</span>
                <span class="trash-bin__modal-value">{{ viewingItem.data.role }}</span>
              </div>
              <div v-if="viewingItem.data.startDate || viewingItem.data.endDate" class="trash-bin__modal-field">
                <span class="trash-bin__modal-label">时间：</span>
                <span class="trash-bin__modal-value">{{ viewingItem.data.startDate }} - {{ viewingItem.data.endDate }}</span>
              </div>
              <div v-if="viewingItem.data.content" class="trash-bin__modal-field trash-bin__modal-field--full">
                <span class="trash-bin__modal-label">内容：</span>
                <div class="trash-bin__modal-value">{{ viewingItem.data.content }}</div>
              </div>
              <div v-if="viewingItem.data.description" class="trash-bin__modal-field trash-bin__modal-field--full">
                <span class="trash-bin__modal-label">描述：</span>
                <div class="trash-bin__modal-value trash-bin__modal-html" v-html="sanitizeHtml(viewingItem.data.description)" />
              </div>
            </div>
          </div>
          <div v-else-if="viewingItem.type === 'evaluation'" class="trash-bin__modal-content">
            <div class="trash-bin__modal-richtext" v-html="sanitizeHtml(viewingItem.data)" />
          </div>
        </div>
      </div>
    </div>

    <!-- 合并冲突弹窗 -->
    <MergeConflictModal
      :visible="showMergeModal"
      :section-id="pendingSectionId"
      :section-label="SECTION_CONFIG[pendingSectionId]?.label || pendingSectionId"
      :conflicts="pendingConflicts"
      @ok="handleConflictOk"
      @cancel="handleConflictCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useResumeStore } from '@/stores/resumeStore'
import { SECTION_CONFIG, getSectionTitle, getCustomSectionType } from '@/types/resume'
import type { FieldConflict } from '@/types/resume'
import { dialog } from '@/plugins/naive-ui'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import MergeConflictModal from './MergeConflictModal.vue'

const store = useResumeStore()

// 查看状态
const viewingItem = ref<{ type: 'section' | 'card' | 'evaluation'; title: string; data: any } | null>(null)

// 合并冲突弹窗状态
const showMergeModal = ref(false)
const pendingSectionId = ref('')
const pendingConflicts = ref<FieldConflict[]>([])

// 是否有删除数据
const hasDeletedData = computed(() => {
  const items = store.currentResume?.deletedItems
  const sections = store.currentResume?.deletedSections
  if (!items && !sections) return false
  const hasItems = items && Object.values(items).some(arr => arr && arr.length > 0)
  const hasSections = sections && Object.keys(sections).length > 0
  return hasItems || hasSections
})

// 已删除 sections 列表
const deletedSectionsList = computed(() => {
  const sections = store.currentResume?.deletedSections
  if (!sections) return []

  const result: { id: string; label: string; deletedAt: string }[] = []
  for (const [key, data] of Object.entries(sections)) {
    if (data) {
      // ponytail: customTexts/customCards 是 Record，需要展开；label 优先用回收箱保存的 sectionTitle
      if (key === 'customTexts') {
        const customTexts = data as Record<string, { data: any; deletedAt: string; sectionTitle?: string }>
        for (const [sectionId, sectionData] of Object.entries(customTexts)) {
          result.push({
            id: sectionId,
            label: sectionData.sectionTitle || getSectionTitle(store.currentResume, sectionId) || '纯文本模块',
            deletedAt: sectionData.deletedAt,
          })
        }
      } else if (key === 'customCards') {
        const customCards = data as Record<string, { data: any; deletedAt: string; sectionTitle?: string }>
        for (const [sectionId, sectionData] of Object.entries(customCards)) {
          result.push({
            id: sectionId,
            label: sectionData.sectionTitle || getSectionTitle(store.currentResume, sectionId) || '卡片类模块',
            deletedAt: sectionData.deletedAt,
          })
        }
      } else {
        const sectionData = data as { deletedAt: string; sectionTitle?: string }
        result.push({
          id: key,
          label: sectionData.sectionTitle || SECTION_CONFIG[key]?.label || getSectionTitle(store.currentResume, key) || key,
          deletedAt: sectionData.deletedAt,
        })
      }
    }
  }
  return result
})

// 已删除 cards 列表
const deletedCardsList = computed(() => {
  const items = store.currentResume?.deletedItems
  if (!items) return []

  const result: { id: string; label: string; sectionId: string; sectionLabel: string; deletedAt: string }[] = []

  // work
  if (items.work?.length) {
    for (const d of items.work) {
      result.push({
        id: d.data.id,
        label: d.data.company || d.data.position || '工作经历',
        sectionId: 'work',
        sectionLabel: SECTION_CONFIG.work?.label || '工作经历',
        deletedAt: d.deletedAt,
      })
    }
  }

  // education
  if (items.education?.length) {
    for (const d of items.education) {
      result.push({
        id: d.data.id,
        label: d.data.school || d.data.major || '教育经历',
        sectionId: 'education',
        sectionLabel: SECTION_CONFIG.education?.label || '教育经历',
        deletedAt: d.deletedAt,
      })
    }
  }

  // projects
  if (items.projects?.length) {
    for (const d of items.projects) {
      result.push({
        id: d.data.id,
        label: d.data.name || d.data.role || '项目经历',
        sectionId: 'projects',
        sectionLabel: SECTION_CONFIG.projects?.label || '项目经历',
        deletedAt: d.deletedAt,
      })
    }
  }

  // skills
  if (items.skills?.length) {
    for (const d of items.skills) {
      result.push({
        id: d.data.id,
        label: '技能',
        sectionId: 'skills',
        sectionLabel: SECTION_CONFIG.skills?.label || '技能',
        deletedAt: d.deletedAt,
      })
    }
  }

  // customCards
  if (items.customCards?.length) {
    for (const d of items.customCards) {
      result.push({
        id: d.data.id,
        label: d.data.name || d.data.role || '自定义卡片',
        sectionId: 'customCard',
        sectionLabel: SECTION_CONFIG.customCard?.label || '自定义列表',
        deletedAt: d.deletedAt,
      })
    }
  }

  return result
})

// 格式化时间
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  return `${diffDays} 天前`
}

// 恢复 section
const handleRestoreSection = (sectionId: string) => {
  const type = getCustomSectionType(sectionId)

  // 自定义模块：可重复创建，直接追加为新模块到末尾，无弹窗
  if (type === 'customText' || type === 'customCard') {
    store.restoreSectionWithMerge(sectionId, false)
    return
  }

  // 固有模块：检查是否重复
  const result = store.restoreSection(sectionId)
  if (result === 'duplicate') {
    // 第一步弹窗：覆盖/合并选择
    dialog.warning({
      title: '模块已存在',
      content: '该功能模块已存在，请选择操作方式：覆盖将替换现有内容，合并将追加到现有内容之后。',
      positiveText: '覆盖',
      negativeText: '合并',
      onPositiveClick: () => {
        // 覆盖模式：直接覆盖现有内容
        store.restoreSectionWithMerge(sectionId, false)
      },
      onNegativeClick: () => {
        // 合并模式：检测是否有字段冲突（标题不同或单富文本段冲突）
        const detection = store.detectSectionConflicts(sectionId)
        if (detection.hasConflict) {
          // 第二步弹窗：字段级冲突处理
          pendingSectionId.value = sectionId
          pendingConflicts.value = detection.conflicts
          showMergeModal.value = true
        } else {
          // 无冲突：直接合并（concat）
          store.restoreSectionWithMerge(sectionId, true)
        }
      },
    })
  }
}

// 合并冲突弹窗：应用
const handleConflictOk = (conflicts: FieldConflict[]) => {
  store.restoreSectionWithMerge(pendingSectionId.value, true, conflicts)
  showMergeModal.value = false
}

// 合并冲突弹窗：取消
const handleConflictCancel = () => {
  showMergeModal.value = false
}

// 删除 section
const handleDeleteSection = (sectionId: string) => {
  dialog.warning({
    title: '永久删除',
    content: '确定要永久删除这个模块吗？此操作不可撤销。',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      store.permanentDeleteSection(sectionId)
    },
  })
}

// 恢复 card
const handleRestoreCard = (sectionId: string, itemId: string) => {
  const result = store.restoreCard(sectionId, itemId)
  if (result === 'section_deleted') {
    // 原所属 section 已被删除：让用户选择新建 section 承接，或取消
    const isCustom = sectionId === 'customCard'
    const sectionLabel = isCustom
      ? (getSectionTitle(store.currentResume, sectionId) || SECTION_CONFIG.customCard?.label || '自定义列表')
      : (SECTION_CONFIG[sectionId as keyof typeof SECTION_CONFIG]?.label || sectionId)
    dialog.warning({
      title: '所属模块已删除',
      content: `该卡片所属模块「${sectionLabel}」已被删除。是否${isCustom ? '新建一个模块' : '重新启用模块'}来承接这张卡片？`,
      positiveText: isCustom ? '新建模块并恢复' : '重新启用并恢复',
      negativeText: '取消',
      onPositiveClick: () => {
        store.restoreCardToNewSection(sectionId, itemId)
      },
    })
    return
  }
  if (result === 'duplicate') {
    dialog.warning({
      title: '模块已存在',
      content: '该功能模块已存在，请选择操作方式：覆盖将替换现有内容，合并将添加到末尾。',
      positiveText: '覆盖',
      negativeText: '合并',
      onPositiveClick: () => {
        store.restoreCardWithMerge(sectionId, itemId, false)
      },
      onNegativeClick: () => {
        store.restoreCardWithMerge(sectionId, itemId, true)
      },
    })
  }
}

// 删除 card
const handleDeleteCard = (sectionId: string, itemId: string) => {
  dialog.warning({
    title: '永久删除',
    content: '确定要永久删除这个卡片吗？此操作不可撤销。',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      store.permanentDeleteCard(sectionId, itemId)
    },
  })
}

// 清空所有
const handleClearAll = () => {
  dialog.warning({
    title: '清空回收箱',
    content: '确定要清空所有已删除的内容吗？此操作不可撤销。',
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: () => {
      store.clearDeletedCards()
    },
  })
}

// 查看 section
const handleViewSection = (sectionId: string) => {
  const sectionData = store.currentResume?.deletedSections?.[sectionId as keyof typeof store.currentResume.deletedSections]
  if (!sectionData) {
    // 尝试从 customTexts/customCards Record 中查找
    const customTexts = store.currentResume?.deletedSections?.customTexts
    const customCards = store.currentResume?.deletedSections?.customCards

    if (customTexts && customTexts[sectionId]) {
      const data = customTexts[sectionId]
      // 纯文本模块的 content 也是富文本 HTML；标题优先用回收箱保存的
      viewingItem.value = {
        type: 'evaluation',
        title: data.sectionTitle || getSectionTitle(store.currentResume, sectionId) || '纯文本模块',
        data: data.data.content || '(空)',
      }
    } else if (customCards && customCards[sectionId]) {
      const data = customCards[sectionId]
      viewingItem.value = {
        type: 'section',
        title: data.sectionTitle || getSectionTitle(store.currentResume, sectionId) || '卡片类模块',
        data: data.data.items || [],
      }
    }
    return
  }

  const sectionAny = sectionData as any
  const title = sectionAny.sectionTitle || SECTION_CONFIG[sectionId]?.label || getSectionTitle(store.currentResume, sectionId) || sectionId
  const data = sectionAny.data

  // evaluation 是纯文本
  if (sectionId === 'evaluation') {
    viewingItem.value = { type: 'evaluation', title, data }
  } else {
    viewingItem.value = { type: 'section', title, data: (data as any[]).map(item => ({ ...item })) }
  }
}

// 查看 card
const handleViewCard = (sectionId: string, itemId: string) => {
  const items = store.currentResume?.deletedItems
  if (!items) return

  const key = (['work', 'education', 'projects', 'skills'] as const).includes(sectionId as any) ? sectionId as keyof typeof items : 'customCards'
  const cardList = items[key]
  if (!cardList) return

  const card = cardList.find((d: any) => d.data.id === itemId)
  if (!card) return

  const data = card.data as any
  const title = data.company || data.school || data.name || data.position || '卡片'
  viewingItem.value = { type: 'card', title, data }
}
</script>

<style lang="scss" scoped>
.trash-bin-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: $spacing-md;
  overflow-y: auto;
  @include scrollbar;
}

.trash-bin__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-md;
}

.trash-bin__title {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-primary;
}

.trash-bin__hint {
  font-size: $font-size-xs;
  color: $text-light;
}

.trash-bin__clear {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $error-color;
  font-size: $font-size-xs;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba($error-color, 0.08);
    color: #e85555; // ponytail: darken($error-color, 5%) → 手动计算，避免 Sass 3.0 弃用警告
  }

  &:active {
    transform: scale(0.95);
  }
}

.trash-bin__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  color: $text-light;

  p {
    font-size: $font-size-sm;
  }
}

.trash-bin__list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.trash-bin__group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.trash-bin__group-title {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $text-secondary;
  padding-bottom: $spacing-xs;
  border-bottom: 1px solid $border-glass;
}

.trash-bin__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm;
  background: var(--bg-glass);
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-glass-hover);
  }
}

.trash-bin__item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trash-bin__item-label {
  font-size: $font-size-sm;
  font-weight: 500;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-bin__item-meta {
  font-size: $font-size-xs;
  color: $text-light;
}

.trash-bin__item-time {
  font-size: $font-size-xs;
  color: $text-secondary;
}

.trash-bin__item-actions {
  display: flex;
  gap: $spacing-xs;
}

.trash-bin__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $text-secondary;
  font-size: $font-size-xs;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--bg-glass-hover);
  }

  &--restore {
    color: $success-color;

    &:hover {
      background: rgba($success-color, 0.1);
    }
  }

  &--view {
    color: $primary-color;

    &:hover {
      background: rgba($primary-color, 0.1);
    }
  }

  &--delete {
    color: $error-color;

    &:hover {
      background: rgba($error-color, 0.1);
    }
  }
}

// 查看弹窗
.trash-bin__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-md;
}

.trash-bin__modal {
  max-width: 600px;
  max-height: 80vh;
  width: 100%;
  background: var(--bg-solid);
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.trash-bin__modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid $border-glass;
}

.trash-bin__modal-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-primary;
}

.trash-bin__modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  border-radius: $radius-sm;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-glass-hover);
  }
}

.trash-bin__modal-body {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-md $spacing-lg;
  @include scrollbar;
}

.trash-bin__modal-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.trash-bin__modal-item {
  padding: $spacing-sm;
  background: var(--bg-glass-hover);
  border-radius: $radius-md;
}

.trash-bin__modal-field {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  margin-bottom: $spacing-xs;

  &:last-child {
    margin-bottom: 0;
  }

  &--full {
    flex-direction: column;
  }
}

.trash-bin__modal-label {
  font-size: $font-size-sm;
  font-weight: 500;
  color: $text-secondary;
  min-width: 60px;
}

.trash-bin__modal-value {
  font-size: $font-size-sm;
  color: $text-primary;
}

.trash-bin__modal-html,
.trash-bin__modal-richtext {
  max-height: 200px;
  overflow-y: auto;
  @include scrollbar;

  :deep(p) {
    margin: 0 0 $spacing-sm;
    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(ul),
  :deep(ol) {
    margin: 0;
    padding-left: $spacing-md;
  }

  :deep(li) {
    margin-bottom: $spacing-xs;
  }

  :deep(strong),
  :deep(b) {
    font-weight: $font-weight-semibold;
  }

  :deep(em),
  :deep(i) {
    font-style: italic;
  }

  :deep(mark) {
    background: rgba(255, 235, 59, 0.3);
    padding: 0 2px;
    border-radius: 2px;
  }
}

.trash-bin__modal-text,
.trash-bin__modal-richtext {
  font-size: $font-size-sm;
  color: $text-primary;
  line-height: 1.6;

  p {
    margin: 0 0 $spacing-xs 0;
  }

  p:last-child {
    margin-bottom: 0;
  }

  ul, ol {
    margin: 0;
    padding-left: $spacing-md;
  }

  li {
    margin-bottom: $spacing-xs;
  }

  strong,
  b {
    font-weight: $font-weight-semibold;
  }

  em,
  i {
    font-style: italic;
  }

  mark {
    background: rgba($yellow-color, 0.2);
    padding: 0 2px;
    border-radius: 2px;
  }

  code {
    background: rgba(0, 0, 0, 0.06);
    padding: 2px 4px;
    border-radius: $radius-sm;
    font-family: $font-family;
    font-size: 0.9em;
  }
}
</style>