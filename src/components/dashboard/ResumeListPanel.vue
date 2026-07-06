<template>
  <div class="resume-list-panel">
    <!-- 顶部标题 + 操作按钮 -->
    <div class="resume-list-panel__header">
      <h2 class="resume-list-panel__title">
        <Icon icon="mdi:file-document-outline" :width="24" />
        我的简历
        <span v-if="store.resumeCount > 0" class="resume-list-panel__count">{{ store.resumeCount }}</span>
      </h2>
      <div class="resume-list-panel__actions">
        <button class="action-btn action-btn--primary" @click="createNewResume">
          <Icon icon="mdi:plus" :width="18" />
          新建简历
        </button>
        <button class="action-btn action-btn--secondary" @click="showMethodModal = true">
          <Icon icon="mdi:file-upload-outline" :width="18" />
          导入简历
        </button>
        <button
          v-if="store.resumeCount > 0 && !selectionMode"
          class="action-btn action-btn--secondary"
          @click="enterSelectionMode"
        >
          <Icon icon="mdi:checkbox-multiple-blank-outline" :width="18" />
          批量管理
        </button>
      </div>
    </div>

    <!-- 简历网格 -->
    <div v-if="store.resumeCount > 0 && !selectionMode" class="resume-list-panel__toolbar">
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索简历标题或内容..."
        clearable
        size="small"
        class="resume-list-panel__search"
      >
        <template #prefix>
          <Icon icon="mdi:magnify" :width="16" />
        </template>
      </n-input>
      <n-select
        v-model:value="sortKey"
        :options="sortOptions"
        size="small"
        class="resume-list-panel__sort"
      />
      <button class="sort-order-btn" :title="sortOrder === 'desc' ? '降序' : '升序'" @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'">
        <Icon :icon="sortOrder === 'desc' ? 'mdi:sort-descending' : 'mdi:sort-ascending'" :width="18" />
      </button>
    </div>

    <!-- 选择态工具栏 -->
    <div v-if="selectionMode" class="resume-list-panel__select-toolbar">
      <button class="select-toolbar__btn" @click="toggleSelectAll">
        <Icon :icon="allSelected ? 'mdi:checkbox-multiple-outline' : 'mdi:checkbox-multiple-blank-outline'" :width="18" />
        {{ allSelected ? '取消全选' : '全选' }}
      </button>
      <span class="select-toolbar__count">已选 {{ selectedIds.size }} 项</span>
      <div class="select-toolbar__spacer"></div>
      <button class="select-toolbar__btn select-toolbar__btn--danger" :disabled="selectedIds.size === 0" @click="onBatchDelete">
        <Icon icon="mdi:trash-can-outline" :width="18" />
        删除选中
      </button>
      <button class="select-toolbar__btn" @click="exitSelectionMode">取消</button>
    </div>

    <!-- 空状态 -->
    <div v-if="store.resumeCount === 0" class="resume-list-panel__empty">
      <div class="empty__icon">
        <Icon icon="mdi:file-document-plus-outline" :width="64" />
      </div>
      <p class="empty__text">还没有简历，点击上方按钮开始创建</p>
      <p class="empty__hint">或切换到「模版市场」选择模板快速开始</p>
    </div>

    <!-- 搜索无结果 -->
    <div v-if="store.resumeCount > 0 && filteredAndSortedResumes.length === 0" class="resume-list-panel__no-results">
      <Icon icon="mdi:magnify-close" :width="40" />
      <p>未找到匹配「{{ searchQuery }}」的简历</p>
    </div>

    <!-- 简历网格 -->
    <div v-else-if="filteredAndSortedResumes.length > 0" class="resume-list-panel__grid">
      <ResumeCard
        v-for="resume in filteredAndSortedResumes"
        :key="resume.id"
        :resume="resume"
        :selectable="selectionMode"
        :selected="selectedIds.has(resume.id)"
        @edit="openResume(resume.id)"
        @copy="onCopyResume(resume.id)"
        @delete="onDeleteResume(resume.id)"
        @toggle-select="toggleSelect(resume.id)"
      />
    </div>

    <!-- 导入方式选择弹窗 -->
    <ImportMethodModal
      :visible="showMethodModal"
      @close="showMethodModal = false"
      @select="handleImportMethodSelect"
    />

    <!-- AI 智能导入弹窗 -->
    <AIImportModal
      :show="showAIImportModal"
      @close="showAIImportModal = false"
      @import="handleAIImport"
      @go-to-settings="handleGoToAISettings"
    />

    <!-- JSON 导入弹窗 -->
    <ImportModal
      :visible="showJSONImportModal"
      @close="showJSONImportModal = false; importErrors = []"
      @import="handleImportFile"
    />

    <!-- 导入校验错误展示 -->
    <n-modal
      :show="importErrors.length > 0"
      preset="card"
      :style="{ maxWidth: '520px', width: '90vw' }"
      :mask-closable="true"
      @update:show="(v: boolean) => { if (!v) importErrors = [] }"
    >
      <template #header>
        <div style="display: flex; align-items: center; gap: 8px; color: var(--error-color, #e74c3c); font-weight: 600;">
          <Icon icon="mdi:alert-circle-outline" :width="20" />
          导入验证失败
        </div>
      </template>
      <p style="margin: 0 0 12px; font-size: 13px; color: var(--text-secondary);">JSON 文件结构与预期格式不匹配，请检查以下问题：</p>
      <ul class="import-error-list">
        <li v-for="(err, i) in importErrors" :key="i">
          <span v-if="err.path" class="import-error-list__path">{{ err.path }}</span>
          <span>{{ err.message }}</span>
        </li>
      </ul>
      <template #footer>
        <div style="display: flex; justify-content: flex-end;">
          <n-button size="small" @click="importErrors = []">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useResumeStore } from '@/stores/resumeStore'
import type { ImportResult } from '@/stores/resumeStore'
import type { ValidationError } from '@/schemas/resumeSchema'
import { useResumeSearch } from '@/composables/useResumeSearch'
import { readJSONFile } from '@/utils/export'
import { message as naiveMessage, dialog } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import { NInput, NSelect, NModal, NButton } from 'naive-ui'
import ImportModal from '@/components/home/ImportModal.vue'
import ImportMethodModal from '@/components/dashboard/ImportMethodModal.vue'
import AIImportModal from '@/components/dashboard/AIImportModal.vue'
import ResumeCard from '@/components/home/ResumeCard.vue'

const router = useRouter()
const store = useResumeStore()
const showMethodModal = ref(false)
const showAIImportModal = ref(false)
const showJSONImportModal = ref(false)
const searchQuery = ref('')
const importErrors = ref<ValidationError[]>([])
const sortKey = ref<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 批量选择
const selectionMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())

const enterSelectionMode = () => {
  selectionMode.value = true
  selectedIds.value = new Set()
}

const exitSelectionMode = () => {
  selectionMode.value = false
  selectedIds.value = new Set()
}

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const allSelected = computed(() =>
  filteredAndSortedResumes.value.length > 0 &&
  filteredAndSortedResumes.value.every(r => selectedIds.value.has(r.id))
)

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredAndSortedResumes.value.map(r => r.id))
  }
}

const onBatchDelete = () => {
  const ids = [...selectedIds.value]
  if (ids.length === 0) return
  dialog.warning({
    title: '批量删除简历',
    content: `确定要删除选中的 ${ids.length} 份简历吗？如需找回可前往回收站`,
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: 'justify-content: center',
    onPositiveClick: () => {
      store.trashResumes(ids)
      exitSelectionMode()
    },
  })
}

// 全文搜索
const { filteredResumes } = useResumeSearch(computed(() => store.resumeList), searchQuery)

const sortOptions = [
  { label: '最近更新', value: 'updatedAt' },
  { label: '创建时间', value: 'createdAt' },
  { label: '名称', value: 'title' },
]

const filteredAndSortedResumes = computed(() => {
  // filteredResumes 已包含搜索过滤（标题 + 内容）
  let list = [...filteredResumes.value]

  list.sort((a, b) => {
    let comparison = 0
    if (sortKey.value === 'title') {
      comparison = (a.title || '').localeCompare(b.title || '', 'zh-CN')
    } else {
      comparison = (a[sortKey.value] || '').localeCompare(b[sortKey.value] || '')
    }
    return sortOrder.value === 'asc' ? comparison : -comparison
  })

  return list
})

const createNewResume = () => {
  // 跳转到模板市场tab，让用户选择模板创建简历
  router.push({ path: '/dashboard', query: { tab: 'templates' } })
}

const openResume = (id: string) => {
  // ponytail: 立即跳转，编辑器内部用骨架屏兜住 store 加载与路由 chunk 下载
  router.push(`/editor/${id}`)
}

const onDeleteResume = (id: string) => {
  dialog.warning({
    title: '删除简历',
    content: '确定要删除这个简历吗？如需找回可前往回收站',
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: 'justify-content: center',
    onPositiveClick: () => {
      // 不用 async — 避免 Naive UI 等待 Promise resolve 才关闭弹窗
      // deleteResume 内部 await saveToStorageNow() 是持久化写入，
      // 内存列表已同步移除，持久化在后台完成即可
      store.deleteResume(id)
    },
  })
}

const onCopyResume = async (id: string) => {
  try {
    await store.copyResume(id)
  } catch (e) {
    console.error('复制简历失败:', e)
    naiveMessage.error('复制失败，请重试')
  }
}

const handleImportFile = async (file: File) => {
  try {
    const json = await readJSONFile(file)
    const result: ImportResult = await store.importFromJSON(json)
    if (result.success) {
      importErrors.value = []
      showJSONImportModal.value = false
      naiveMessage.success('导入成功！')
    } else {
      importErrors.value = result.errors || []
      naiveMessage.error(`导入失败：发现 ${result.errors?.length || 0} 个验证错误`)
    }
  } catch (e) {
    naiveMessage.error('导入失败：' + (e as Error).message)
  }
}

// ========== 导入方式选择 ==========

const handleImportMethodSelect = (method: 'ai' | 'json') => {
  showMethodModal.value = false
  if (method === 'ai') {
    showAIImportModal.value = true
  } else {
    showJSONImportModal.value = true
  }
}

// ========== AI 智能导入 ==========

const handleAIImport = (resumeId: string) => {
  showAIImportModal.value = false
  naiveMessage.success('AI 导入成功！正在进入编辑器...')
  router.push(`/editor/${resumeId}`)
}

const handleGoToAISettings = () => {
  showAIImportModal.value = false
  router.push({ path: '/dashboard', query: { tab: 'ai' } })
}
</script>

<style lang="scss" scoped>
.resume-list-panel {
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

  &__empty {
    text-align: center;
    padding: $spacing-3xl 0;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;
    flex-wrap: wrap;
  }

  &__search {
    flex: 1;
    min-width: 180px;
  }

  &__sort {
    width: 140px;
  }

  &__select-toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-lg;
    padding: $spacing-sm $spacing-md;
    background: $bg-glass;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
    flex-wrap: wrap;
  }

  &__no-results {
    text-align: center;
    padding: $spacing-3xl 0;
    color: $text-light;

    p {
      margin-top: $spacing-md;
    }
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
  margin-bottom: $spacing-sm;
}

.empty__hint {
  font-size: $font-size-sm;
  color: $text-light;
  opacity: 0.7;
}

.sort-order-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    background: $bg-glass;
    color: $primary-light;
  }
}

.select-toolbar {
  &__btn {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-md;
    background: transparent;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
    color: $text-primary;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: all $transition-fast;
    font-family: $font-family;

    &:hover:not(:disabled) {
      background: $bg-glass-hover;
      border-color: $primary-color;
    }

    &--danger {
      color: $error-color;
      border-color: rgba($error-color, 0.4);

      &:hover:not(:disabled) {
        background: rgba($error-color, 0.1);
        border-color: $error-color;
      }
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &__count {
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__spacer {
    flex: 1;
  }
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
}

// 响应式
@include tablet {
  .resume-list-panel {
    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: $spacing-md;
    }
  }
}

@include mobile {
  .resume-list-panel {
    &__header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__actions {
      width: 100%;
    }

    &__grid {
      grid-template-columns: 1fr;
      gap: $spacing-md;
    }
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }
}

// 导入校验错误列表
.import-error-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
  @include scrollbar;

  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-glass, rgba(255,255,255,0.06));
    font-size: 13px;
    color: var(--text-primary);

    &:last-child {
      border-bottom: none;
    }
  }

  &__path {
    font-size: 11px;
    font-weight: 600;
    color: var(--primary-light, #6c8cff);
    opacity: 0.8;
  }
}
</style>
