<template>
  <div class="journal-panel">
    <!-- ========== 编辑视图 ========== -->
    <template v-if="view === 'edit' && editingEntry">
      <div class="journal-panel__header journal-panel__header--edit">
        <button class="action-btn action-btn--secondary" @click="exitEdit">
          <Icon icon="mdi:arrow-left" :width="18" />
          返回
        </button>
        <input
          v-model="editingTitle"
          class="journal-edit__title-input"
          placeholder="笔记标题"
        />
        <!-- ponytail: 编辑视图右上角三点菜单：移动 / 删除 -->
        <n-dropdown
          placement="bottom-end"
          trigger="click"
          :options="editMenuOptions"
          @select="onEditMenuSelect"
        >
          <button class="journal-edit__more-btn" title="更多操作">
            <Icon icon="mdi:dots-vertical" :width="20" />
          </button>
        </n-dropdown>
      </div>
      <div class="journal-edit__body">
        <RichTextEditor
          :model-value="editingEntry.content"
          :ai-context="editingEntry.title"
          ai-scene="journal"
          :rows="28"
          allow-image
          placeholder="记下你的求职心得、面试复盘、准备清单..."
          @update:model-value="onContentUpdate"
        />
        <!-- 关联面板 -->
        <div class="journal-edit__links">
          <div class="journal-edit__link-row">
            <Icon icon="mdi:briefcase-outline" :width="18" />
            <span class="journal-edit__link-label">关联面试</span>
            <n-select
              v-model:value="linkInterviewIds"
              multiple
              filterable
              clearable
              size="small"
              :options="interviewOptions"
              placeholder="选择关联的面试"
              class="journal-edit__link-select"
              @update:value="onLinkInterviewsChange"
            />
          </div>
          <div class="journal-edit__link-row">
            <Icon icon="mdi:file-document-outline" :width="18" />
            <span class="journal-edit__link-label">关联简历</span>
            <n-select
              v-model:value="linkResumeIds"
              multiple
              filterable
              clearable
              size="small"
              :options="resumeOptions"
              placeholder="选择关联的简历"
              class="journal-edit__link-select"
              @update:value="onLinkResumesChange"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ========== 网格视图 ========== -->
    <template v-else>
      <div class="journal-panel__header">
        <!-- 面包屑返回（记事本内部）：放最左边，标题之前 -->
        <button v-if="currentNotebookId" class="action-btn action-btn--secondary" @click="currentNotebookId = null">
          <Icon icon="mdi:arrow-left" :width="18" />
          返回
        </button>
        <h2 class="journal-panel__title">
          <Icon icon="mdi:notebook-outline" :width="24" />
          {{ currentNotebook ? currentNotebook.title : '求职手账' }}
          <span v-if="displayEntries.length > 0" class="journal-panel__count">{{ displayEntries.length }}</span>
        </h2>
        <div class="journal-panel__actions">
          <button class="action-btn action-btn--primary" @click="openCreateModal">
            <Icon icon="mdi:plus" :width="18" />
            新建
          </button>
        </div>
      </div>

      <!-- 工具栏 -->
      <div v-if="totalActiveCount > 0" class="journal-panel__toolbar">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索笔记标题或内容..."
          clearable
          size="small"
          class="journal-panel__search"
        >
          <template #prefix>
            <Icon icon="mdi:magnify" :width="16" />
          </template>
        </n-input>
        <n-select
          v-model:value="sortKey"
          :options="sortOptions"
          size="small"
          class="journal-panel__sort"
        />
        <button class="sort-order-btn" :title="sortOrder === 'desc' ? '降序' : '升序'" @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'">
          <Icon :icon="sortOrder === 'desc' ? 'mdi:sort-descending' : 'mdi:sort-ascending'" :width="18" />
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="totalActiveCount === 0" class="journal-panel__empty">
        <div class="empty__icon">
          <Icon icon="mdi:notebook-edit-outline" :width="64" />
        </div>
        <p class="empty__text">还没有手账内容</p>
        <p class="empty__hint">新建记事本分类整理，或直接新建笔记记录求职心得</p>
      </div>

      <!-- 当前视图为空（如进入空记事本） -->
      <div v-else-if="baseEntries.length === 0" class="journal-panel__empty">
        <div class="empty__icon">
          <Icon icon="mdi:note-plus-outline" :width="64" />
        </div>
        <p class="empty__text">{{ currentNotebookId ? '这个记事本还是空的' : '还没有手账内容' }}</p>
        <p class="empty__hint">{{ currentNotebookId ? '新建一条笔记记录求职心得吧' : '新建记事本分类整理，或直接新建笔记记录求职心得' }}</p>
      </div>

      <!-- 搜索无结果 -->
      <div v-else-if="displayEntries.length === 0" class="journal-panel__no-results">
        <Icon icon="mdi:magnify-close" :width="40" />
        <p>未找到匹配「{{ searchQuery }}」的笔记</p>
      </div>

      <!-- 卡片网格（笔记可拖拽收入笔记本，不可排序） -->
      <draggable
        v-else
        v-model="sortableDisplayEntries"
        item-key="id"
        :animation="200"
        ghost-class="journal-card--ghost"
        chosen-class="journal-card--chosen"
        handle=".journal-card__drag-handle"
        class="journal-panel__grid"
        :move="onDragMove"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <div
            class="journal-card"
            :class="{ 'journal-card--notebook': element.type === 'notebook' }"
            :data-id="element.id"
            :data-type="element.type"
          >
            <!-- 拖拽手柄（仅笔记：拖到笔记本上收入该笔记本） -->
            <div v-if="element.type === 'note'" class="journal-card__drag-handle" title="拖到笔记本上收入">
              <Icon icon="mdi:drag-vertical" :width="16" />
            </div>

            <!-- 记事本卡片 -->
            <template v-if="element.type === 'notebook'">
              <div class="journal-card__cover" @click="enterNotebook(element.id)">
                <Icon icon="mdi:folder-outline" :width="40" />
                <span class="journal-card__count">{{ journalStore.notebookCount(element.id) }}</span>
              </div>
              <div class="journal-card__info" @click="enterNotebook(element.id)">
                <h3 class="journal-card__title">{{ element.title }}</h3>
                <p class="journal-card__meta">{{ formatDate(element.updatedAt) }}</p>
              </div>
            </template>

            <!-- 笔记卡片 -->
            <template v-else>
              <div class="journal-card__note-body" @click="enterEdit(element.id)">
                <h3 class="journal-card__title">{{ element.title }}</h3>
                <p class="journal-card__excerpt">{{ deriveExcerpt(element.content) }}</p>
                <div v-if="element.interviewIds.length || element.resumeIds.length" class="journal-card__tags">
                  <span v-if="element.interviewIds.length" class="journal-card__tag journal-card__tag--interview">
                    <Icon icon="mdi:briefcase-outline" :width="12" />
                    {{ element.interviewIds.length }}
                  </span>
                  <span v-if="element.resumeIds.length" class="journal-card__tag journal-card__tag--resume">
                    <Icon icon="mdi:file-document-outline" :width="12" />
                    {{ element.resumeIds.length }}
                  </span>
                </div>
                <p class="journal-card__meta">{{ formatDate(element.updatedAt) }}</p>
                <!-- 移出按钮：仅笔记本内部显示，移到根级 -->
                <button
                  v-if="currentNotebookId"
                  class="journal-card__moveout"
                  title="移出记事本"
                  @click.stop="onMoveOut(element)"
                >
                  <Icon icon="mdi:folder-remove-outline" :width="16" />
                  移出
                </button>
              </div>
            </template>

            <!-- 卡片操作菜单 -->
            <div class="journal-card__menu">
              <button class="journal-card__menu-btn" title="删除" @click.stop="onDelete(element)">
                <Icon icon="mdi:trash-can-outline" :width="16" />
              </button>
            </div>
          </div>
        </template>
      </draggable>
    </template>

    <!-- 重命名记事本弹窗 -->
    <n-modal
      :show="renamingId !== null"
      preset="card"
      :style="{ maxWidth: '420px', width: '90vw' }"
      :mask-closable="true"
      title="重命名记事本"
      @update:show="(v: boolean) => { if (!v) renamingId = null }"
    >
      <n-input v-model:value="renamingTitle" placeholder="记事本名称" @keydown.enter="confirmRename" />
      <template #footer>
        <div class="trash-modal-actions">
          <n-button size="small" type="primary" @click="confirmRename">确定</n-button>
          <n-button size="small" @click="renamingId = null">取消</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 移动笔记弹窗 -->
    <n-modal
      :show="moveModalOpen"
      preset="card"
      :style="{ maxWidth: '420px', width: '90vw' }"
      :mask-closable="true"
      title="移动笔记"
      @update:show="(v: boolean) => { if (!v) moveModalOpen = false }"
    >
      <n-select
        v-model:value="moveTargetId"
        :options="moveTargetOptions"
        placeholder="选择目标记事本或根目录"
      />
      <template #footer>
        <div class="trash-modal-actions">
          <n-button size="small" type="primary" @click="confirmMove">移动</n-button>
          <n-button size="small" @click="moveModalOpen = false">取消</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 新建弹窗（两步：选择类型 → 填表单） -->
    <n-modal
      :show="createModalOpen"
      preset="card"
      :style="{ maxWidth: '460px', width: '90vw' }"
      :mask-closable="true"
      :title="createStep === 'choose' ? '新建' : createStep === 'notebook' ? '新建记事本' : '新建笔记'"
      @update:show="(v: boolean) => { if (!v) closeCreateModal() }"
    >
      <!-- 第一步：选择类型 -->
      <div v-if="createStep === 'choose'" class="create-pick">
        <button class="create-pick__card" @click="goCreateStep('notebook')">
          <Icon icon="mdi:folder-plus-outline" :width="36" />
          <span class="create-pick__title">记事本</span>
          <span class="create-pick__desc">分类整理求职笔记</span>
        </button>
        <button class="create-pick__card" @click="confirmCreateNote">
          <Icon icon="mdi:note-plus-outline" :width="36" />
          <span class="create-pick__title">笔记</span>
          <span class="create-pick__desc">记录面试复盘与心得</span>
        </button>
      </div>

      <!-- 第二步：记事本表单 -->
      <div v-else-if="createStep === 'notebook'">
        <n-input v-model:value="createNotebookName" placeholder="记事本名称" @keydown.enter="confirmCreateNotebook" />
      </div>

      <!-- ponytail: 笔记无需选所属记事本——笔记本内新建归该笔记本，全局新建归全局（见 goCreateStep） -->

      <template #footer>
        <div class="trash-modal-actions">
          <template v-if="createStep === 'choose'">
            <n-button size="small" @click="closeCreateModal">取消</n-button>
          </template>
          <template v-else>
            <n-button size="small" type="primary" @click="confirmCreateNotebook">创建</n-button>
            <n-button size="small" @click="goCreateStep('choose')">返回</n-button>
          </template>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import draggable from 'vuedraggable'
import { useJournalStore } from '@/stores/journalStore'
import { useInterviewStore } from '@/stores/interviewStore'
import { useResumeStore } from '@/stores/resumeStore'
import { dialog } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import { NInput, NSelect, NModal, NButton, NDropdown } from 'naive-ui'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import type { JournalEntry } from '@/types/journal'
import { deriveNoteTitle } from '@/types/journal'

// ponytail: 弹窗按钮规范——操作按钮在左、取消在右、整体居中（与 TrashPanel REVERSE_ACTION 同义）
const REVERSE_ACTION = 'flex-direction: row-reverse; justify-content: center; gap: 12px !important;'

const journalStore = useJournalStore()
const interviewStore = useInterviewStore()
const resumeStore = useResumeStore()

// ========== 视图状态 ==========
const view = ref<'grid' | 'edit'>('grid')
const currentNotebookId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const editingTitle = ref('')

const searchQuery = ref('')
const sortKey = ref<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const renamingId = ref<string | null>(null)
const renamingTitle = ref('')

// ========== 新建弹窗状态 ==========
const createModalOpen = ref(false)
// choose 选类型 / notebook 填记事本名
const createStep = ref<'choose' | 'notebook'>('choose')
const createNotebookName = ref('')

// ========== Computed ==========

const currentNotebook = computed(() =>
  currentNotebookId.value
    ? journalStore.entries.find(e => e.id === currentNotebookId.value) ?? null
    : null,
)

/** 当前网格显示的条目（根级=记事本+根级笔记；记事本内=该记事本下笔记） */
const baseEntries = computed<JournalEntry[]>(() => {
  if (currentNotebookId.value) {
    return journalStore.notesByParent(currentNotebookId.value)
  }
  // 根级：notebook + 根级 note 混排
  return [
    ...journalStore.notebooks,
    ...journalStore.rootNotes,
  ]
})

/** 搜索过滤后的条目 */
const filteredEntries = computed<JournalEntry[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return baseEntries.value
  return baseEntries.value.filter(e => {
    if (e.title.toLowerCase().includes(q)) return true
    if (e.type === 'note') {
      const text = e.content.replace(/<[^>]+>/g, '').toLowerCase()
      if (text.includes(q)) return true
    }
    return false
  })
})

/** 排序后的条目 */
const displayEntries = computed<JournalEntry[]>(() => {
  const list = [...filteredEntries.value]
  list.sort((a, b) => {
    let cmp = 0
    if (sortKey.value === 'title') {
      cmp = (a.title || '').localeCompare(b.title || '', 'zh-CN')
    } else {
      cmp = (a[sortKey.value] || '').localeCompare(b[sortKey.value] || '')
    }
    return sortOrder.value === 'asc' ? cmp : -cmp
  })
  return list
})

/** vuedraggable 双向绑定：拖拽仅改内存顺序，松手后按新顺序回写 updatedAt 排序权重 */
const sortableDisplayEntries = computed({
  get: () => displayEntries.value,
  // ponytail: sort=false 禁止排序，拖拽不改变顺序，setter 永不触发；保留空实现满足 v-model 契约
  set: () => {},
})

const totalActiveCount = computed(() => journalStore.entries.length)

const editingEntry = computed(() =>
  editingId.value ? journalStore.entries.find(e => e.id === editingId.value) ?? null : null,
)

// ========== 关联选择器 ==========

const linkInterviewIds = ref<string[]>([])
const linkResumeIds = ref<string[]>([])

const interviewOptions = computed(() =>
  interviewStore.interviews.map(i => ({
    label: i.company || '未填写公司',
    value: i.id,
  })),
)

const resumeOptions = computed(() =>
  resumeStore.resumeList.map(r => ({
    label: r.title || '未命名简历',
    value: r.id,
  })),
)

// ========== 工具函数 ==========

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const day = 24 * 60 * 60 * 1000
  // ponytail: 用 toDateString() 比日期，避免 getDate() 跨月不连续（31→1）导致当天误判为昨天
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - day).toDateString()
  const dStr = d.toDateString()
  if (dStr === today) {
    return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  if (dStr === yesterday) return '昨天'
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 笔记正文摘要：去标签取前 60 字。纯图片笔记（无文字）显示图片占位 */
const deriveExcerpt = (content: string): string => {
  const text = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  if (!text) return /<img\b/i.test(content) ? '[图片]' : '空笔记'
  return text.length > 60 ? text.slice(0, 60) + '…' : text
}

const sortOptions = [
  { label: '最近更新', value: 'updatedAt' },
  { label: '创建时间', value: 'createdAt' },
  { label: '标题', value: 'title' },
]

// ========== Actions ==========

// ========== 新建弹窗 Actions ==========

const openCreateModal = () => {
  // ponytail: 笔记本内部只能建笔记，直接创建并进入编辑；根级才弹类型选择
  if (currentNotebookId.value) {
    confirmCreateNote()
    return
  }
  createStep.value = 'choose'
  createNotebookName.value = ''
  createModalOpen.value = true
}

const closeCreateModal = () => {
  createModalOpen.value = false
}

const goCreateStep = (step: 'choose' | 'notebook') => {
  createStep.value = step
}

const confirmCreateNotebook = () => {
  const name = createNotebookName.value.trim() || '新记事本'
  journalStore.createNotebook(name)
  closeCreateModal()
}

/** 新建笔记：归属当前所在记事本（笔记本内新建）或根级（全局新建），直接进入编辑 */
const confirmCreateNote = () => {
  const id = journalStore.createNote(currentNotebookId.value)
  closeCreateModal()
  enterEdit(id)
}

const enterNotebook = (id: string) => {
  currentNotebookId.value = id
  searchQuery.value = ''
}

const enterEdit = (id: string) => {
  const entry = journalStore.entries.find(e => e.id === id)
  if (!entry || entry.type !== 'note') return
  editingId.value = id
  editingTitle.value = entry.title
  linkInterviewIds.value = [...entry.interviewIds]
  linkResumeIds.value = [...entry.resumeIds]
  view.value = 'edit'
}

const exitEdit = () => {
  if (editingId.value && editingEntry.value) {
    const title = editingTitle.value.trim()
    // ponytail: 判空须把 <img 算作有内容——纯图片笔记去标签后 text 为空，
    // 否则会被当成空笔记物理删除（用户退出再重进发现笔记没了）
    const hasImage = /<img\b/i.test(editingEntry.value.content)
    const contentText = editingEntry.value.content
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    // 标题空且正文也空：绑定了面试/简历则保留为「新笔记」，否则不创建（物理删除，不进回收站）
    if (!title && !contentText && !hasImage) {
      if (editingEntry.value.interviewIds.length || editingEntry.value.resumeIds.length) {
        journalStore.updateEntry({
          ...editingEntry.value,
          title: '新笔记',
        })
      } else {
        void journalStore.deleteEntry(editingId.value)
      }
    } else {
      // 退出时只在标题为空才自动补全（取正文第一行前6字）；非空则保留用户写的/上次补的，永不自动覆盖
      const finalTitle = title || deriveNoteTitle(editingEntry.value.content)
      journalStore.updateEntry({
        ...editingEntry.value,
        title: finalTitle,
      })
    }
  }
  view.value = 'grid'
  editingId.value = null
}

const onContentUpdate = (content: string) => {
  if (!editingEntry.value) return
  // 编辑期间不动标题：只更新正文，标题输入框也不回写
  journalStore.updateEntry({
    ...editingEntry.value,
    content,
  })
}

// ponytail: 切 tab/路由会卸载组件（DashboardView 无 KeepAlive），exitEdit 不会触发，
// 导致标题修改丢失、空笔记残留。卸载前兜底执行一次 exitEdit 写回标题/清理空笔记。
onBeforeUnmount(() => {
  if (view.value === 'edit') exitEdit()
})

const onLinkInterviewsChange = (ids: string[]) => {
  if (!editingEntry.value) return
  journalStore.updateEntry({
    ...editingEntry.value,
    interviewIds: [...ids],
  })
}

const onLinkResumesChange = (ids: string[]) => {
  if (!editingEntry.value) return
  journalStore.updateEntry({
    ...editingEntry.value,
    resumeIds: [...ids],
  })
}

/** 拖拽移动中：实时高亮悬停的记事本卡片 + 记录放置目标 + 切换收入光标 */
const dropTargetId = ref<string | null>(null)

const onDragMove = (evt: {
  dragged: HTMLElement
  related: HTMLElement | null
  relatedContext: { element: JournalEntry | null }
}): boolean => {
  // ponytail: 始终返回 false 禁止任何排序移动——拖拽只用于「拖到笔记本上收入」，不改变笔记间顺序。
  // 返回 false 仍会触发本回调，故可在此实时记录悬停目标。
  const target = evt.relatedContext.element
  const grid = evt.dragged.parentElement
  grid?.querySelectorAll('.journal-card--drop-target').forEach(el => el.classList.remove('journal-card--drop-target'))
  if (target?.type === 'notebook' && evt.related) {
    evt.related.classList.add('journal-card--drop-target')
    dropTargetId.value = target.id
  } else {
    dropTargetId.value = null
  }
  return false
}

/** 拖拽结束：若释放在记事本卡片上，弹问询确认后移入 */
const onDragEnd = (evt: { oldIndex: number; newIndex: number; item: HTMLElement }) => {
  // ponytail: onDragMove 始终返回 false 禁止移动，故 onEnd 时元素未换位；用 move 实时记录的 dropTargetId 判断是否收入笔记本
  const grid = evt.item.parentElement
  grid?.querySelectorAll('.journal-card--drop-target').forEach(el => el.classList.remove('journal-card--drop-target'))

  const draggedId = evt.item.getAttribute('data-id')
  const targetId = dropTargetId.value
  dropTargetId.value = null
  if (!draggedId || !targetId) return

  const notebook = journalStore.entries.find(e => e.id === targetId)
  const note = journalStore.entries.find(e => e.id === draggedId)
  const notebookTitle = notebook?.title ?? '该记事本'
  const noteTitle = note?.title ?? '该笔记'
  dialog.warning({
    title: '收入记事本',
    content: `确定将笔记「${noteTitle}」放入记事本「${notebookTitle}」吗？`,
    positiveText: '放入',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      journalStore.moveNote(draggedId, targetId)
    },
  })
}

const onMoveOut = (entry: JournalEntry) => {
  dialog.warning({
    title: '移出记事本',
    content: `确定将笔记「${entry.title}」移出记事本吗？移出后将出现在根目录。`,
    positiveText: '移出',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      journalStore.moveNote(entry.id, null)
    },
  })
}

const onDelete = (entry: JournalEntry) => {
  const isNotebook = entry.type === 'notebook'
  const content = isNotebook
    ? `确定要删除记事本「${entry.title}」吗？其中的所有笔记会一并移入回收站，如需找回可前往回收站。`
    : `确定要删除笔记「${entry.title}」吗？如需找回可前往回收站。`
  dialog.warning({
    title: isNotebook ? '删除记事本' : '删除笔记',
    content,
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      journalStore.trashEntry(entry.id)
    },
  })
}

// ========== 重命名记事本 ==========
const confirmRename = () => {
  if (!renamingId.value) return
  const entry = journalStore.entries.find(e => e.id === renamingId.value)
  if (entry) {
    journalStore.updateEntry({
      ...entry,
      title: renamingTitle.value.trim() || '新记事本',
    })
  }
  renamingId.value = null
}

// ========== 编辑视图：移动笔记 ==========
const moveModalOpen = ref(false)
const moveTargetId = ref<string | null>(null)

/** 移动目标选项：根目录 + 所有记事本（排除笔记当前所在记事本） */
const moveTargetOptions = computed(() => {
  const currentParent = editingEntry.value?.parentId ?? null
  return [
    { label: '根目录', value: '__root__' },
    ...journalStore.notebooks
      .filter(n => n.id !== currentParent)
      .map(n => ({ label: n.title, value: n.id })),
  ]
})

const editMenuOptions = [
  { label: '移动', key: 'move' },
  { label: '删除', key: 'delete' },
]

const onEditMenuSelect = (key: string) => {
  if (key === 'move') {
    moveTargetId.value = editingEntry.value?.parentId ?? '__root__'
    moveModalOpen.value = true
  } else if (key === 'delete') {
    const entry = editingEntry.value
    if (!entry || !editingId.value) return
    const id = editingId.value
    dialog.warning({
      title: '删除笔记',
      content: `确定要删除笔记「${entry.title}」吗？如需找回可前往回收站。`,
      positiveText: '删除',
      negativeText: '取消',
      actionStyle: REVERSE_ACTION,
      onPositiveClick: () => {
        // ponytail: 编辑视图删除——先退出编辑回到所在视图（笔记本内或根级），再走 trashEntry（与卡片删除同路径）
        view.value = 'grid'
        editingId.value = null
        void journalStore.trashEntry(id)
      },
    })
  }
}

const confirmMove = () => {
  if (!editingId.value) return
  const target = moveTargetId.value === '__root__' ? null : moveTargetId.value
  journalStore.moveNote(editingId.value, target)
  moveModalOpen.value = false
}
</script>

<style lang="scss" scoped>
.journal-panel {
  height: 100%;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xl;
    flex-wrap: wrap;
    gap: $spacing-md;

    &--edit {
      justify-content: flex-start;
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-xl;
    font-weight: 700;
    @include gradient-text;
    // ponytail: 标题紧贴左侧返回按钮，不居中；margin-right:auto 把它和右边的操作按钮分开
    margin-right: auto;
  }

  &__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 8px;
    border-radius: 12px;
    background: rgba(124, 92, 252, 0.15);
    color: $primary-light;
    font-size: $font-size-xs;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
    flex-wrap: wrap;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;
  }

  &__search {
    flex: 1;
    max-width: 320px;
  }

  &__sort {
    width: 140px;
  }

  &__grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: $spacing-lg;
    align-content: start;
    align-items: start; // 笔记顶对齐、保留各自内容高度，不被同行最高的笔记撑高（内容长短不一）
    overflow-y: auto;
    @include scrollbar;
    padding-bottom: $spacing-xl;
  }

  &__empty,
  &__no-results {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    color: $text-light;
  }

  .empty__icon {
    margin-bottom: $spacing-md;
    opacity: 0.4;
  }

  .empty__text {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-secondary;
  }

  .empty__hint {
    font-size: $font-size-sm;
  }
}

// 卡片（对齐 InterviewCard：实色 bg-primary + 极细边框 + hover 边框变蓝，无阴影）
.journal-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: $radius-lg;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: border-color 0.15s ease;
  cursor: pointer;

  &:hover {
    border-color: $primary-color;
  }

  &--ghost {
    opacity: 0.5;
    border: 1px dashed $primary-color;
  }

  // 拖拽悬停的放置目标（记事本）：高亮 + 收入光标
  &--drop-target {
    border-color: $primary-color;
    box-shadow: 0 0 0 2px rgba($primary-color, 0.4);
    cursor: copy;
  }

  &--chosen {
    cursor: grabbing;
  }

  &__drag-handle {
    position: absolute;
    top: 6px;
    left: 6px;
    color: $text-light;
    opacity: 0;
    cursor: grab;
    transition: opacity $transition-base;
    z-index: 2;
  }

  &:hover &__drag-handle {
    opacity: 0.5;
  }

  // 记事本封面：橙色渐变背景 + 橙色文件夹 icon，与笔记卡片（紫色色条）冷暖区分
  &__cover {
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: linear-gradient(135deg, rgba($yellow-dark, 0.22), rgba($yellow-color, 0.12));
    color: $yellow-dark;
  }

  &__count {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: var(--bg-glass-active);
    color: $text-secondary;
    font-size: $font-size-xs;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: $radius-full;
  }

  &__info {
    padding: $spacing-md $spacing-lg;
    border-top: 1px solid var(--border-color);
  }

  &__note-body {
    padding: $spacing-md $spacing-lg $spacing-md $spacing-lg;
    // ponytail: 左侧紫色色条区分笔记（与橙色笔记本封面冷暖对比），border-left + 负 margin 让色条贴到卡片左缘
    border-left: 3px solid rgba(124, 92, 252, 0.6);
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  // 移出按钮：钉在笔记卡片右下角，仅笔记本内部显示
  &__moveout {
    position: absolute;
    bottom: $spacing-sm;
    right: $spacing-sm;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    border: none;
    border-radius: $radius-sm;
    background: transparent;
    color: $text-light;
    font-size: 11px;
    cursor: pointer;
    transition: all $transition-base;
    z-index: 2;

    &:hover {
      color: $primary-color;
      background: rgba($primary-color, 0.1);
    }
  }

  &__title {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__excerpt {
    font-size: $font-size-xs;
    color: $text-secondary;
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 36px;
  }

  &__tags {
    display: flex;
    gap: $spacing-xs;
    margin-top: auto;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 1px 6px;
    border-radius: $radius-sm;
    font-size: 11px;

    &--interview {
      background: rgba($secondary-color, 0.12);
      color: $secondary-light;
    }

    &--resume {
      background: rgba($primary-color, 0.12);
      color: $primary-light;
    }
  }

  &__meta {
    font-size: 11px;
    color: $text-light;
    margin: 0;
  }

  &__menu {
    position: absolute;
    top: $spacing-sm;
    right: $spacing-sm;
    display: flex;
    gap: 2px;
    opacity: 0;
    transform: translateY(-4px);
    transition: all 0.2s ease;
    z-index: 2;
  }

  &:hover &__menu {
    opacity: 1;
    transform: translateY(0);
  }

  // 操作按钮：对齐 InterviewCard，半透明主色/错误色，hover 加深
  &__menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: $radius-sm;
    background: rgba($error-color, 0.8);
    color: #fff;
    cursor: pointer;
    transition: background $transition-base;

    &:hover {
      background: $error-color;
    }
  }
}

// 编辑视图
.journal-edit {
  &__title-input {
    flex: 1;
    max-width: 500px;
    border: none;
    background: transparent;
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
    outline: none;
    border-bottom: 2px solid transparent;
    padding: 4px 0;
    transition: border-color $transition-base;

    &:focus {
      border-bottom-color: $primary-color;
    }
  }

  &__more-btn {
    // ponytail: 编辑视图右上角三点菜单触发钮，与 sort-order-btn 同款极简方块
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid $border-glass;
    border-radius: $radius-sm;
    background: rgba(255, 255, 255, 0.04);
    color: $text-secondary;
    cursor: pointer;
    transition: all $transition-base;
    margin-left: auto;

    &:hover {
      color: $text-primary;
      border-color: $primary-color;
    }
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    min-height: 0;

    // ponytail: 编辑器撑满剩余高度，关联面板钉底
    :deep(.rich-text-editor) {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      margin-bottom: 0;

      .rich-text-editor__wrapper {
        flex: 1;
        min-height: 0;
        resize: none;
      }
    }
  }

  &__links {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-md;
    border-radius: $radius-md;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  &__link-row {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__link-label {
    font-size: $font-size-sm;
    color: $text-secondary;
    white-space: nowrap;
    width: 64px;
  }

  &__link-select {
    flex: 1;
  }
}

// 操作按钮（复用 ResumeListPanel 风格）
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
    color: #fff;

    &:hover {
      background: $primary-dark;
    }
  }

  &--secondary {
    background: rgba(255, 255, 255, 0.06);
    color: $text-primary;
    border: 1px solid $border-glass;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.sort-order-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  background: rgba(255, 255, 255, 0.04);
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    color: $text-primary;
    border-color: $primary-color;
  }
}

// 新建弹窗：类型选择卡片
.create-pick {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-lg $spacing-md;
    border: 1px solid var(--border-color);
    border-radius: $radius-lg;
    background: var(--bg-primary);
    color: $text-secondary;
    cursor: pointer;
    transition: all $transition-base;
    font-family: $font-family;

    &:hover {
      border-color: $primary-color;
      color: $primary-light;
      background: var(--bg-glass-hover);
    }
  }

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-light;
  }
}
</style>

<!-- ponytail: 弹窗按钮规范需全局生效——n-modal teleport 到 body，scoped :deep 选择器匹配不到 -->
<style lang="scss">
.trash-modal-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  width: 100%;
}
</style>
