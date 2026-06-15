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
        <button class="action-btn action-btn--secondary" @click="showImportModal = true">
          <Icon icon="mdi:file-upload-outline" :width="18" />
          导入简历
        </button>
      </div>
    </div>

    <!-- 简历网格 -->
    <div v-if="store.resumeCount > 0" class="resume-list-panel__toolbar">
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索简历..."
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
        @edit="openResume(resume.id)"
        @copy="onCopyResume(resume.id)"
        @delete="onDeleteResume(resume.id)"
      />
    </div>

    <!-- 导入弹窗 -->
    <ImportModal
      :visible="showImportModal"
      @close="showImportModal = false"
      @import="handleImportFile"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useResumeStore } from '@/stores/resumeStore'
import { readJSONFile } from '@/utils/export'
import { message as naiveMessage, dialog } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import { NInput, NSelect } from 'naive-ui'
import ImportModal from '@/components/home/ImportModal.vue'
import ResumeCard from '@/components/home/ResumeCard.vue'

const router = useRouter()
const store = useResumeStore()
const showImportModal = ref(false)
const searchQuery = ref('')
const sortKey = ref<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortOptions = [
  { label: '最近更新', value: 'updatedAt' },
  { label: '创建时间', value: 'createdAt' },
  { label: '名称', value: 'title' },
]

const filteredAndSortedResumes = computed(() => {
  let list = [...store.resumeList]

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()
    list = list.filter(r => r.title.toLowerCase().includes(query))
  }

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

const createNewResume = async () => {
  const id = await store.createResume()
  router.push(`/templates/${id}`)
}

const openResume = (id: string) => {
  router.push(`/editor/${id}`)
}

const onDeleteResume = async (id: string) => {
  dialog.warning({
    title: '删除简历',
    content: '确定要删除这个简历吗？此操作不可撤销。',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.deleteResume(id)
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
    if (await store.importFromJSON(json)) {
      showImportModal.value = false
      naiveMessage.success('导入成功！')
    } else {
      naiveMessage.error('导入失败，请检查文件格式')
    }
  } catch (e) {
    naiveMessage.error('导入失败：' + (e as Error).message)
  }
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
</style>
