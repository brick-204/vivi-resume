<template>
  <div class="interview-panel">
    <!-- 详情视图（v-show 保留列表滚动位置） -->
    <InterviewDetail
      v-show="selectedId"
      :interview="selectedInterview"
      :mode="detailMode"
      @back="onDetailBack"
      @edit="detailMode = 'edit'"
      @ai="openAIPanel(selectedId!, 'mockInterview')"
      @saved="onDetailSaved"
      @cancel="onDetailCancel"
    />

    <!-- 列表视图 -->
    <div v-show="!selectedId">
    <!-- 顶部标题 + 操作按钮 -->
    <div class="interview-panel__header">
      <h2 class="interview-panel__title">
        <Icon icon="mdi:briefcase-outline" :width="24" />
        我的面试
        <span v-if="interviews.length > 0" class="interview-panel__count">{{ interviews.length }}</span>
      </h2>

      <!-- 简历筛选（普通+批量模式均可用） -->
      <div class="interview-panel__filter">
        <NSelect
          v-model:value="filterResumeId"
          :options="resumeFilterOptions"
          filterable
          clearable
          placeholder="按关联简历筛选"
          size="small"
          :consistent-menu-width="false"
        />
      </div>

      <!-- 普通模式操作 -->
      <div v-if="!batchMode" class="interview-panel__actions">
        <button class="action-btn action-btn--primary" @click="showCreate = true">
          <Icon icon="mdi:plus" :width="18" />
          新建面试
        </button>
        <button
          v-if="interviews.length > 0"
          class="action-btn action-btn--secondary"
          @click="enterBatchMode"
        >
          <Icon icon="mdi:checkbox-multiple-outline" :width="18" />
          批量删除
        </button>
      </div>

      <!-- 批量模式操作 -->
      <div v-else class="interview-panel__actions">
        <button class="action-btn action-btn--secondary" @click="toggleSelectAll">
          <Icon :icon="allSelected ? 'mdi:checkbox-multiple-blank-outline' : 'mdi:checkbox-multiple-marked-outline'" :width="18" />
          {{ allSelected ? '取消全选' : '全选' }}
        </button>
        <button
          class="action-btn action-btn--danger"
          :disabled="selectedIds.size === 0"
          @click="onBatchDelete"
        >
          <Icon icon="mdi:trash-can-outline" :width="18" />
          删除选中{{ selectedIds.size > 0 ? `(${selectedIds.size})` : '' }}
        </button>
        <button class="action-btn action-btn--secondary" @click="exitBatchMode">取消</button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="interviews.length === 0" class="interview-panel__empty">
      <div class="empty__icon">
        <Icon icon="mdi:briefcase-plus-outline" :width="64" />
      </div>
      <p class="empty__text">还没有面试记录，点击上方按钮开始记录</p>
    </div>

    <!-- 三段分区 -->
    <template v-else>
      <section v-if="upcomingInterviews.length > 0" class="interview-panel__segment">
        <button class="interview-panel__segment-title" @click="toggleSegment('upcoming')">
          <Icon
            icon="mdi:chevron-right"
            :width="20"
            class="interview-panel__segment-arrow"
            :class="{ 'is-collapsed': isCollapsed('upcoming') }"
          />
          即将面试
          <span class="interview-panel__segment-count">{{ upcomingInterviews.length }}</span>
        </button>
        <div v-show="!isCollapsed('upcoming')" class="interview-panel__grid">
          <InterviewCard
            v-for="i in upcomingInterviews"
            :key="i.id"
            :interview="i"
            :selectable="batchMode"
            :selected="selectedIds.has(i.id)"
            @view="onView(i.id)"
            @copy="onCopy(i.id)"
            @delete="onDelete(i.id)"
            @ai="openAIPanel(i.id, 'mockInterview')"
            @toggle-select="toggleSelect(i.id)"
          />
        </div>
      </section>

      <section v-if="ongoingInterviews.length > 0" class="interview-panel__segment">
        <button class="interview-panel__segment-title" @click="toggleSegment('ongoing')">
          <Icon
            icon="mdi:chevron-right"
            :width="20"
            class="interview-panel__segment-arrow"
            :class="{ 'is-collapsed': isCollapsed('ongoing') }"
          />
          进行中
          <span class="interview-panel__segment-count">{{ ongoingInterviews.length }}</span>
        </button>
        <div v-show="!isCollapsed('ongoing')" class="interview-panel__grid">
          <InterviewCard
            v-for="i in ongoingInterviews"
            :key="i.id"
            :interview="i"
            :selectable="batchMode"
            :selected="selectedIds.has(i.id)"
            @view="onView(i.id)"
            @copy="onCopy(i.id)"
            @delete="onDelete(i.id)"
            @ai="openAIPanel(i.id, 'mockInterview')"
            @toggle-select="toggleSelect(i.id)"
          />
        </div>
      </section>

      <section v-if="endedInterviews.length > 0" class="interview-panel__segment">
        <button class="interview-panel__segment-title" @click="toggleSegment('ended')">
          <Icon
            icon="mdi:chevron-right"
            :width="20"
            class="interview-panel__segment-arrow"
            :class="{ 'is-collapsed': isCollapsed('ended') }"
          />
          已结束
          <span class="interview-panel__segment-count">{{ endedInterviews.length }}</span>
        </button>
        <div v-show="!isCollapsed('ended')" class="interview-panel__grid">
          <InterviewCard
            v-for="i in endedInterviews"
            :key="i.id"
            :interview="i"
            :selectable="batchMode"
            :selected="selectedIds.has(i.id)"
            @view="onView(i.id)"
            @copy="onCopy(i.id)"
            @delete="onDelete(i.id)"
            @ai="openAIPanel(i.id, 'mockInterview')"
            @toggle-select="toggleSelect(i.id)"
          />
        </div>
      </section>

      <!-- 筛选无匹配 -->
      <div v-if="visibleInterviews.length === 0" class="interview-panel__empty">
        <div class="empty__icon">
          <Icon icon="mdi:filter-remove-outline" :width="64" />
        </div>
        <p class="empty__text">没有关联该简历的面试记录</p>
      </div>
    </template>
    </div>

    <!-- 新建方式选择 -->
    <InterviewCreateModal
      :visible="showCreate"
      @close="showCreate = false"
      @create="handleCreateMode"
    />

    <!-- AI 助手面板 -->
    <InterviewAIPanel
      :show="showAIPanel"
      :mode="aiMode"
      :interview-id="aiInterviewId"
      @close="showAIPanel = false"
      @parsed-jd="handleParsedJd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useInterviewStore } from '@/stores/interviewStore'
import { useResumeStore } from '@/stores/resumeStore'
import { NSelect } from 'naive-ui'
import { message as naiveMessage, dialog } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import InterviewCard from '@/components/dashboard/InterviewCard.vue'
import InterviewDetail from '@/components/dashboard/InterviewDetail.vue'
import InterviewCreateModal from '@/components/dashboard/InterviewCreateModal.vue'
import InterviewAIPanel from '@/components/dashboard/InterviewAIPanel.vue'

const store = useInterviewStore()
const { interviews } = storeToRefs(store)
const resumeStore = useResumeStore()

// ponytail: 按关联简历筛选——本地 ref + computed 过滤三段分区，不动 store
const filterResumeId = ref<string | null>(null)

// 下拉选项：仅列出被面试关联过的简历（去重），按 title 搜索由 NSelect filterable 完成
const resumeFilterOptions = computed(() => {
  const usedIds = new Set(interviews.value.map(i => i.resumeId).filter(Boolean) as string[])
  const byId = new Map(resumeStore.resumeList.map(r => [r.id, r.title]))
  return [...usedIds]
    .map(id => ({ label: byId.get(id) ?? '(已删除简历)', value: id }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

// 筛选后的三段分区：若未选简历则原样透传
const filterFn = (i: { resumeId: string | null }) =>
  !filterResumeId.value || i.resumeId === filterResumeId.value

const upcomingInterviews = computed(() => store.upcomingInterviews.filter(filterFn))
const ongoingInterviews = computed(() => store.ongoingInterviews.filter(filterFn))
const endedInterviews = computed(() => store.endedInterviews.filter(filterFn))

// 详情视图选中态 + 模式（列表↔详情就地切换；详情可切编辑态）
const selectedId = ref<string | null>(null)
const detailMode = ref<'view' | 'edit'>('view')
const selectedInterview = computed(() =>
  selectedId.value ? interviews.value.find(i => i.id === selectedId.value) ?? null : null,
)

// 本地模态框状态
const showCreate = ref(false)

// 批量删除模式
const batchMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())

// ponytail: 三段分区展开态——本地 ref，默认全展开，不持久化（YAGNI）
const collapsed = ref<Record<string, boolean>>({})
const toggleSegment = (key: string) => {
  collapsed.value = { ...collapsed.value, [key]: !collapsed.value[key] }
}
const isCollapsed = (key: string) => !!collapsed.value[key]

const showAIPanel = ref(false)
const aiMode = ref<'mockInterview' | 'review' | 'parseJd'>('mockInterview')
const aiInterviewId = ref<string | null>(null)

// ========== 交互处理 ==========

const handleCreateMode = (mode: 'hand' | 'jd') => {
  showCreate.value = false
  if (mode === 'jd') {
    // JD 解析走 AI 面板
    aiInterviewId.value = null
    aiMode.value = 'parseJd'
    showAIPanel.value = true
  } else {
    // 新建空记录，直接进详情页编辑态
    const newId = store.createInterview()
    selectedId.value = newId
    detailMode.value = 'edit'
  }
}

const onView = (id: string) => {
  selectedId.value = id
  detailMode.value = 'view'
}

// ========== 批量删除 ==========

const enterBatchMode = () => {
  batchMode.value = true
  selectedIds.value = new Set()
}

const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value = new Set()
}

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

// 筛选后当前可见的面试（全选作用域）
const visibleInterviews = computed(() => [
  ...upcomingInterviews.value,
  ...ongoingInterviews.value,
  ...endedInterviews.value,
])

// 全选 / 取消全选：作用于当前所有可见卡片（受简历筛选影响）
const allSelected = computed(() => {
  if (visibleInterviews.value.length === 0) return false
  return visibleInterviews.value.every(i => selectedIds.value.has(i.id))
})

const toggleSelectAll = () => {
  if (allSelected.value) {
    // ponytail: 取消全选只清空可见项，保留对不可见项的选中（若有）
    const next = new Set(selectedIds.value)
    visibleInterviews.value.forEach(i => next.delete(i.id))
    selectedIds.value = next
  } else {
    selectedIds.value = new Set([...selectedIds.value, ...visibleInterviews.value.map(i => i.id)])
  }
}

const onBatchDelete = () => {
  const count = selectedIds.value.size
  if (count === 0) return
  dialog.warning({
    title: '移入回收站',
    content: `确定要删除选中的 ${count} 条面试记录吗？将移入回收站，可在回收站恢复`,
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: 'flex-direction: row-reverse; justify-content: center; gap: 12px',
    onPositiveClick: () => {
      store.trashInterviews([...selectedIds.value])
      exitBatchMode()
    },
  })
}

// 退出详情：编辑态下若公司名为空（新建未填）则物理删除该空记录（不进回收站）
const exitDetail = () => {
  const cur = selectedInterview.value
  if (cur && detailMode.value === 'edit' && !cur.company.trim()) {
    store.purgeInterview(cur.id)
  }
  selectedId.value = null
  detailMode.value = 'view'
}

const onDetailBack = () => exitDetail()

// 取消编辑：空记录（新建未填）退出并删除；已有记录切回只读
const onDetailCancel = () => {
  const cur = selectedInterview.value
  if (cur && !cur.company.trim()) {
    exitDetail()
  } else {
    detailMode.value = 'view'
  }
}

const onDetailSaved = () => {
  detailMode.value = 'view'
}

const onDelete = (id: string) => {
  dialog.warning({
    title: '移入回收站',
    content: '确定要删除这条面试记录吗？将移入回收站，可在回收站恢复',
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: 'flex-direction: row-reverse; justify-content: center; gap: 12px',
    onPositiveClick: () => {
      store.trashInterview(id)
      // 删除当前详情项时返回列表
      if (selectedId.value === id) {
        selectedId.value = null
        detailMode.value = 'view'
      }
    },
  })
}

const onCopy = (id: string) => {
  store.duplicateInterview(id)
  naiveMessage.success('已复制面试记录')
}

const openAIPanel = (id: string | null, mode: 'mockInterview' | 'review' | 'parseJd') => {
  aiInterviewId.value = id
  aiMode.value = mode
  showAIPanel.value = true
}

const handleParsedJd = (fields: { company: string; position: string; salary: string; location: string; jd: string }) => {
  showAIPanel.value = false
  // ponytail: 用解析字段新建一条 interview，进详情页编辑态补充
  const newId = store.createInterview(fields)
  naiveMessage.success('JD 解析成功，请补充信息')
  selectedId.value = newId
  detailMode.value = 'edit'
}
</script>

<style lang="scss" scoped>
.interview-panel {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xl;
    flex-wrap: wrap;
    gap: $spacing-md;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-xl;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
  }

  &__count {
    padding: $spacing-xs $spacing-md;
    background: $primary-bg-active;
    color: $text-white;
    border-radius: $radius-full;
    font-size: $font-size-sm;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    gap: $spacing-md;
  }

  &__filter {
    width: 220px;
  }

  &__empty {
    text-align: center;
    padding: $spacing-3xl 0;
  }

  &__segment {
    margin-bottom: $spacing-xl;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__segment-title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 $spacing-md;
    // button 重置
    padding: 0;
    border: none;
    background: none;
    font-family: $font-family;
    cursor: pointer;
    user-select: none;
    transition: color $transition-base;

    &:hover {
      color: $primary-color;
    }
  }

  &__segment-arrow {
    transition: transform $transition-base;
    color: $text-secondary;
    flex-shrink: 0;

    // ponytail: 收起时箭头朝右（默认），展开时旋转 90° 朝下
    &.is-collapsed {
      transform: rotate(0deg);
    }
    &:not(.is-collapsed) {
      transform: rotate(90deg);
    }
  }

  &__segment-count {
    padding: 1px $spacing-sm;
    background: $bg-glass;
    color: $text-secondary;
    border-radius: $radius-full;
    font-size: $font-size-xs;
    font-weight: 600;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    grid-auto-rows: min-content;
    gap: $spacing-xl;
  }
}

.empty__icon {
  margin-bottom: $spacing-lg;
  color: $text-light;
  opacity: 0.5;
}

.empty__text {
  font-size: $font-size-md;
  color: $text-light;
  margin: 0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: none;
  font-family: $font-family;

  &--primary {
    background: $primary-color;
    color: $text-white;
    box-shadow: $shadow-sm;

    &:hover {
      background: $primary-light;
      box-shadow: $shadow-md;
    }
  }

  &--secondary {
    background: $bg-glass;
    color: $text-primary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
      border-color: $primary-color;
      transform: translateY(-2px);
    }
  }

  &--danger {
    background: rgba($error-color, 0.12);
    color: $error-color;
    border: 1px solid rgba($error-color, 0.3);

    &:hover:not(:disabled) {
      background: rgba($error-color, 0.2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// 响应式：仅 tablet，无 mobile
@include tablet {
  .interview-panel {
    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: $spacing-md;
    }
  }
}
</style>
