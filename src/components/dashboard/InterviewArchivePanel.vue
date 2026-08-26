<template>
  <div class="interview-archive">
    <!-- 顶部：返回 + 标题 + 搜索 -->
    <div class="interview-archive__header">
      <div class="interview-archive__head-left">
        <button class="interview-archive__back" title="返回面试列表" @click="$emit('back')">
          <Icon icon="mdi:arrow-left" :width="18" />
        </button>
        <h2 class="interview-archive__title">
          <Icon icon="mdi:archive-outline" :width="24" />
          归档箱
        </h2>
      </div>
      <NInput
        v-model:value="keyword"
        placeholder="搜索公司、岗位、状态、简历、薪资、轮数、面试地点、工作地点"
        size="small"
        clearable
        :consistent-menu-width="false"
        style="width: 320px"
      >
        <template #prefix>
          <Icon icon="mdi:magnify" :width="16" />
        </template>
      </NInput>
    </div>

    <!-- 空状态：无归档 -->
    <div v-if="store.archivedInterviews.length === 0" class="interview-archive__empty">
      <div class="empty__icon">
        <Icon icon="mdi:archive-outline" :width="64" />
      </div>
      <p class="empty__text">暂无归档的面试</p>
    </div>

    <!-- 表格 -->
    <div v-else class="interview-archive__table">
      <!-- ponytail: n-data-table 的 :pagination 接收普通对象快照，reactive 也不行，
           naive 内部会解包并缓存，页码/页大小切换不触发重渲染。
           改用 <n-pagination> 独立组件驱:data切片，手动维护 page/pageSize。 -->
      <n-data-table
        :columns="columns"
        :data="paginatedData"
        :bordered="false"
        :single-line="false"
        size="small"
        :row-key="(row: AnyData) => row.id"
      />
      <div class="interview-archive__pagination" v-if="filtered.length > 0">
        <n-pagination
          :page="page"
          :page-size="pageSize"
          :page-sizes="[10, 30, 50]"
          :item-count="filtered.length"
          show-size-picker
          @update:page="page = $event"
          @update:page-size="pageSize = $event; page = 1"
        >
          <template #prefix="{ itemCount }">
            共 {{ itemCount }} 条
          </template>
        </n-pagination>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { NDataTable, NInput, NButton, NPagination, type DataTableColumns } from 'naive-ui'
import { useInterviewStore } from '@/stores/interviewStore'
import { useResumeStore } from '@/stores/resumeStore'
import { dialog } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import type { Interview, InterviewStatus } from '@/types/interview'

interface AnyData {
  id: string
  [key: string]: unknown
}

defineEmits<{ back: [] }>()

const store = useInterviewStore()
const resumeStore = useResumeStore()

// 关键词模糊搜索
const keyword = ref('')

// 分页参数——独立 ref，naive 内部不缓存，始终能写回
const page = ref(1)
const pageSize = ref(10)

// 搜索时重置到第一页
watch(keyword, () => { page.value = 1 })

/** 多字段模糊匹配：公司/岗位/状态/简历/薪资/轮数/面试地点/工作地点 */
const matches = (i: Interview, kw: string): boolean => {
  const q = kw.trim().toLowerCase()
  if (!q) return true
  const resumeTitle = i.resumeId
    ? resumeStore.resumeList.find(r => r.id === i.resumeId)?.title ?? ''
    : ''
  const haystack = [
    i.company,
    i.position,
    STATUS_LABEL[i.status],
    resumeTitle,
    i.salary,
    `${i.rounds.length}轮`,
    i.interviewLocation,
    i.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

// ponytail: filtered 必须在 paginatedData 之前声明——TDZ 否则 setup 阶段直接抛
const filtered = computed(() => store.archivedInterviews.filter(i => matches(i, keyword.value)))

// 当前页切片数据
const paginatedData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

// 状态中文映射 + 徽章样式（与 InterviewCard 复用同名映射）
const STATUS_LABEL: Record<InterviewStatus, string> = {
  drafting: '草稿',
  submitted: '已投递',
  interviewing: '面试中',
  offer: 'Offer',
  rejected: '未通过',
  closed: '已结束',
}
const STATUS_STYLE: Record<InterviewStatus, { bg: string; color: string }> = {
  drafting: { bg: 'rgba(120, 120, 120, 0.15)', color: '#999' },
  submitted: { bg: 'rgba(52, 152, 219, 0.15)', color: '#3498db' },
  interviewing: { bg: 'rgba(243, 156, 18, 0.15)', color: '#f39c12' },
  offer: { bg: 'rgba(39, 174, 96, 0.15)', color: '#27ae60' },
  rejected: { bg: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c' },
  closed: { bg: 'rgba(120, 120, 120, 0.15)', color: '#999' },
}

/** 最后更新：确切年月日，格式 `YYYY-MM-DD`（非法 ISO 返回空串） */
const fullDate = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 出档：放回卡片列表 */
const handleUnarchive = (id: string) => {
  const iv = store.archivedInterviews.find(i => i.id === id)
  if (!iv) return
  const name = iv.company?.trim() || iv.position?.trim() || '这条面试'
  dialog.success({
    title: '出档',
    content: `确定将「${name}」从归档箱放出，回到卡片列表吗？`,
    positiveText: '出档',
    negativeText: '取消',
    actionStyle: 'flex-direction: row-reverse; justify-content: center; gap: 12px !important;',
    onPositiveClick: () => store.unarchiveInterview(id),
  })
}

/** 删除：移入回收站（可恢复） */
const handleDelete = (id: string) => {
  const iv = store.archivedInterviews.find(i => i.id === id)
  if (!iv) return
  const name = iv.company?.trim() || iv.position?.trim() || '这条面试'
  dialog.warning({
    title: '移入回收站',
    content: `确定将「${name}」移入回收站吗？可在回收站恢复`,
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: 'flex-direction: row-reverse; justify-content: center; gap: 12px !important;',
    onPositiveClick: () => {
      store.trashInterview(id)
    },
  })
}

/** 单元格渲染辅助 */
const renderText = (text: unknown): string => {
  if (text == null || text === '') return '-'
  return String(text)
}

// 列定义
const columns: DataTableColumns<Interview> = [
  {
    title: '公司名',
    key: 'company',
    render: row => renderText(row.company),
  },
  {
    title: '岗位',
    key: 'position',
    render: row => renderText(row.position),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: row => {
      const s = STATUS_STYLE[row.status]
      return h('span', {
        style: {
          display: 'inline-flex',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          background: s.bg,
          color: s.color,
        },
      }, STATUS_LABEL[row.status])
    },
  },
  {
    title: '关联简历',
    key: 'resume',
    render: row => {
      if (!row.resumeId) return '-'
      const title = resumeStore.resumeList.find(r => r.id === row.resumeId)?.title
      return title || '-'
    },
  },
  {
    title: '薪资',
    key: 'salary',
    render: row => renderText(row.salary),
  },
  {
    title: '轮数',
    key: 'rounds',
    width: 70,
    render: row => (row.rounds.length > 0 ? `${row.rounds.length}轮` : '-'),
  },
  {
    title: '面试地点',
    key: 'interviewLocation',
    render: row => renderText(row.interviewLocation),
  },
  {
    title: '工作地点',
    key: 'location',
    render: row => renderText(row.location),
  },
  {
    title: '最后更新',
    key: 'updatedAt',
    width: 100,
    render: row => fullDate(row.updatedAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: row =>
      h('div', { style: 'display:flex;gap:6px;' }, [
        h(NButton, {
          size: 'tiny',
          tertiary: true,
          type: 'primary',
          onClick: () => handleUnarchive(row.id),
        }, { icon: () => h(Icon, { icon: 'mdi:archive-arrow-up', width: 16 }) }),
        h(NButton, {
          size: 'tiny',
          tertiary: true,
          type: 'error',
          onClick: () => handleDelete(row.id),
        }, { icon: () => h(Icon, { icon: 'mdi:trash-can-outline', width: 16 }) }),
      ]),
  },
]
</script>

<style lang="scss" scoped>
.interview-archive {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  &__empty {
    text-align: center;
    padding: $spacing-3xl 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: $spacing-md;
    margin-bottom: $spacing-xs;
  }

  &__head-left {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: $radius-md;
    border: 1px solid $border-glass;
    background: $bg-glass;
    color: $text-secondary;
    cursor: pointer;
    transition: all $transition-base;
    font-family: $font-family;

    &:hover {
      background: $bg-glass-hover;
      color: $primary-color;
      border-color: $primary-color;
    }
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

  // 表格容器：圆角 + 玻璃背景 + 溢出隐藏（配合 n-data-table 内部圆角）
  &__table {
    overflow: hidden;
    border-radius: $radius-lg;
    border: 1px solid $border-glass;
    background: var(--bg-glass);
  }
}

// Naive DataTable 覆盖（unscoped，因为 n-data-table 内部 DOM 不在 scoped 范围内）
// ponytail: 项目仅此一处 n-data-table，全局覆盖不影响其他组件
:deep(.n-data-table) {
  font-size: $font-size-sm;
  color: $text-primary;
}

:deep(.n-data-table .n-data-table__th) {
  background: var(--bg-glass-hover);
  color: $text-secondary;
  font-weight: $font-weight-semibold;
  font-size: $font-size-xs;
  text-transform: none;
  letter-spacing: 0.02em;
  border-bottom: 1px solid $border-glass;
  padding: 14px $spacing-md;
  height: auto;
}

:deep(.n-data-table .n-data-table__td) {
  background: transparent;
  border-bottom: 1px solid rgba($border-glass, 0.5);
  padding: 14px $spacing-md;
  height: auto;
  color: $text-primary;
  font-size: $font-size-sm;
}

// 末行无边框
:deep(.n-data-table .n-data-table__tr:last-child .n-data-table__td) {
  border-bottom: none;
}

// 行 hover 反馈
:deep(.n-data-table .n-data-table__tr:hover .n-data-table__td) {
  background: var(--bg-glass-hover);
}

// 空状态提示文字
:deep(.n-data-table .n-data-table__empty) {
  padding: $spacing-xl 0;
  color: $text-light;
  font-size: $font-size-sm;
}

// 分页器：表格下方，居中
:deep(.interview-archive__pagination) {
  padding: $spacing-md;
  display: flex;
  justify-content: center;
  border-top: 1px solid rgba($border-glass, 0.5);
}

// 操作按钮列：图标按钮样式统一
:deep(.n-button.n-button--tiny) {
  font-size: $font-size-xs;
  border-radius: $radius-sm;
  height: 28px;
  min-width: 28px;
  padding: 0 6px;
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
</style>