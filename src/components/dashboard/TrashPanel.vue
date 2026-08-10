<template>
  <div class="trash-panel">
    <!-- 顶部标题 -->
    <div class="trash-panel__header">
      <h2 class="trash-panel__title">
        <Icon icon="mdi:delete-outline" :width="24" />
        回收站
        <span v-if="totalCount > 0" class="trash-panel__count">{{ totalCount }}</span>
      </h2>
      <div class="trash-panel__actions">
        <button
          v-if="totalCount > 0"
          class="empty-trash-btn"
          @click="handleEmptyTrash"
        >
          <Icon icon="mdi:delete-forever" :width="18" />
          清空回收站
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="totalCount === 0" class="trash-panel__empty">
      <div class="empty__icon">
        <Icon icon="mdi:delete-off-outline" :width="64" />
      </div>
      <p class="empty__text">回收站是空的</p>
      <p class="empty__hint">删除的简历、面试记录、手账和桌宠会在这里保留 {{ store.trashRetentionDays }} 天</p>
    </div>

    <!-- 回收站列表 -->
    <div v-else class="trash-panel__list">
      <!-- 简历分区 -->
      <div v-if="trashCount > 0" class="trash-section">
        <h3 class="trash-section__title">
          <Icon icon="mdi:file-document-outline" :width="18" />
          简历（{{ trashCount }}）
        </h3>
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

      <!-- 桌宠分区 -->
      <div v-if="petCount > 0" class="trash-section">
        <h3 class="trash-section__title">
          <Icon icon="mdi:cat" :width="18" />
          桌宠（{{ petCount }}）
        </h3>
        <div
          v-for="pet in trashPetsWithRemainingDays"
          :key="pet.id"
          class="trash-item trash-item--pet"
        >
          <div class="trash-item__info trash-item__info--pet">
            <PetPreview :pet-id="pet.id" :pet="pet" />
            <div class="trash-item__meta-wrap">
              <h3 class="trash-item__title">{{ pet.name }}</h3>
              <p class="trash-item__meta">
                删除于 {{ formatDate(pet.deletedAt) }}
                <span class="trash-item__remaining">剩余 {{ pet.remainingDays }} 天</span>
              </p>
            </div>
          </div>
          <div class="trash-item__actions">
            <button class="trash-item__btn trash-item__btn--restore" @click="handleRestorePet(pet.id)">
              <Icon icon="mdi:restore" :width="18" />
              恢复
            </button>
            <button class="trash-item__btn trash-item__btn--delete" @click="handlePermanentDeletePet(pet.id)">
              <Icon icon="mdi:delete-forever" :width="18" />
              永久删除
            </button>
          </div>
        </div>
      </div>

      <!-- 面试分区 -->
      <div v-if="interviewCount > 0" class="trash-section">
        <h3 class="trash-section__title">
          <Icon icon="mdi:briefcase-outline" :width="18" />
          面试（{{ interviewCount }}）
        </h3>
        <div
          v-for="interview in trashInterviewsWithRemainingDays"
          :key="interview.id"
          class="trash-item"
        >
          <div class="trash-item__info">
            <h3 class="trash-item__title">{{ interview.company || '未填写公司' }}</h3>
            <p class="trash-item__meta">
              删除于 {{ formatDate(interview.deletedAt) }}
              <span class="trash-item__remaining">剩余 {{ interview.remainingDays }} 天</span>
            </p>
          </div>
          <div class="trash-item__actions">
            <button class="trash-item__btn trash-item__btn--restore" @click="handleRestoreInterview(interview.id)">
              <Icon icon="mdi:restore" :width="18" />
              恢复
            </button>
            <button class="trash-item__btn trash-item__btn--delete" @click="handlePermanentDeleteInterview(interview.id)">
              <Icon icon="mdi:delete-forever" :width="18" />
              永久删除
            </button>
          </div>
        </div>
      </div>

      <!-- AI 配置分区 -->
      <div v-if="aiConfigCount > 0" class="trash-section">
        <h3 class="trash-section__title">
          <Icon icon="mdi:robot-outline" :width="18" />
          AI 服务（{{ aiConfigCount }}）
        </h3>
        <div
          v-for="config in trashAIConfigsWithRemainingDays"
          :key="config.id"
          class="trash-item"
        >
          <div class="trash-item__info">
            <h3 class="trash-item__title">{{ config.name || '未命名配置' }}</h3>
            <p class="trash-item__meta">
              删除于 {{ formatDate(config.deletedAt) }}
              <span class="trash-item__remaining">剩余 {{ config.remainingDays }} 天</span>
            </p>
          </div>
          <div class="trash-item__actions">
            <button class="trash-item__btn trash-item__btn--restore" @click="handleRestoreAIConfig(config.id)">
              <Icon icon="mdi:restore" :width="18" />
              恢复
            </button>
            <button class="trash-item__btn trash-item__btn--delete" @click="handlePermanentDeleteAIConfig(config.id)">
              <Icon icon="mdi:delete-forever" :width="18" />
              永久删除
            </button>
          </div>
        </div>
      </div>

      <!-- 手账分区（记事本 + 单独删的笔记；随记事本连带删的笔记不单独显示，恢复记事本连带恢复） -->
      <div v-if="journalCount > 0" class="trash-section">
        <h3 class="trash-section__title">
          <Icon icon="mdi:notebook-outline" :width="18" />
          手账（{{ journalCount }}）
        </h3>
        <div
          v-for="journal in trashJournalsWithRemainingDays"
          :key="journal.id"
          class="trash-item"
        >
          <div class="trash-item__info">
            <h3 class="trash-item__title">
              <Icon :icon="journal.type === 'notebook' ? 'mdi:folder-outline' : 'mdi:note-outline'" :width="16" style="margin-right: 4px; vertical-align: -2px;" />
              {{ journal.title }}
            </h3>
            <p class="trash-item__meta">
              删除于 {{ formatDate(journal.deletedAt) }}
              <span class="trash-item__remaining">剩余 {{ journal.remainingDays }} 天</span>
            </p>
          </div>
          <div class="trash-item__actions">
            <button class="trash-item__btn trash-item__btn--restore" @click="handleRestoreJournal(journal.id)">
              <Icon icon="mdi:restore" :width="18" />
              恢复
            </button>
            <button class="trash-item__btn trash-item__btn--delete" @click="handlePermanentDeleteJournal(journal.id)">
              <Icon icon="mdi:delete-forever" :width="18" />
              永久删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 恢复桌宠弹窗 -->
    <n-modal
      :show="showRestorePetModal"
      preset="dialog"
      title="恢复桌宠"
      :auto-focus="false"
      :content="`确定要恢复「${restorePetTarget?.name || '这个桌宠'}」吗？`"
      @update:show="v => { if (!v) { showRestorePetModal = false; restoringPetId = null } }"
    >
      <template #action>
        <div class="trash-modal-actions">
          <button class="trash-modal-btn trash-modal-btn--primary" :disabled="actionPending" @click="confirmRestorePet">
            <Icon :icon="actionPending ? 'mdi:loading' : 'mdi:restore'" :width="16" :class="{ 'is-spin-trash': actionPending }" />
            恢复
          </button>
          <button class="trash-modal-btn trash-modal-btn--ghost" :disabled="actionPending" @click="showRestorePetModal = false; restoringPetId = null">
            取消
          </button>
        </div>
      </template>
    </n-modal>

    <!-- 永久删除桌宠弹窗 -->
    <n-modal
      :show="showPurgePetModal"
      preset="dialog"
      title="永久删除"
      :auto-focus="false"
      :content="`确定要永久删除「${purgePetTarget?.name || '这个桌宠'}」吗？此操作不可撤销。`"
      @update:show="v => { if (!v) { showPurgePetModal = false; purgingPetId = null } }"
    >
      <template #action>
        <div class="trash-modal-actions">
          <button class="trash-modal-btn trash-modal-btn--danger" :disabled="actionPending" @click="confirmPurgePet">
            <Icon :icon="actionPending ? 'mdi:loading' : 'mdi:delete-forever'" :width="16" :class="{ 'is-spin-trash': actionPending }" />
            删除
          </button>
          <button class="trash-modal-btn trash-modal-btn--ghost" :disabled="actionPending" @click="showPurgePetModal = false; purgingPetId = null">
            取消
          </button>
        </div>
      </template>
    </n-modal>

    <!-- 清空回收站弹窗 -->
    <n-modal
      :show="showEmptyTrashModal"
      preset="dialog"
      title="清空回收站"
      :auto-focus="false"
      :content="`确定要清空回收站吗？这将永久删除 ${trashCount} 个简历、${interviewCount} 个面试记录、${aiConfigCount} 个 AI 服务、${journalCount} 个手账和 ${petCount} 个桌宠，此操作不可撤销。`"
      @update:show="v => { if (!v) showEmptyTrashModal = false }"
    >
      <template #action>
        <div class="trash-modal-actions">
          <button class="trash-modal-btn trash-modal-btn--danger" :disabled="actionPending" @click="confirmEmptyTrash">
            <Icon :icon="actionPending ? 'mdi:loading' : 'mdi:delete-forever'" :width="16" :class="{ 'is-spin-trash': actionPending }" />
            清空
          </button>
          <button class="trash-modal-btn trash-modal-btn--ghost" :disabled="actionPending" @click="showEmptyTrashModal = false">
            取消
          </button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal } from 'naive-ui'
import { useResumeStore } from '@/stores/resumeStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useInterviewStore } from '@/stores/interviewStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { useJournalStore } from '@/stores/journalStore'
import { dialog } from '@/plugins/naive-ui'
import PetPreview from '@/components/ai/PetPreview.vue'

const store = useResumeStore()
const settingsStore = useSettingsStore()
const interviewStore = useInterviewStore()
const aiConfigStore = useAIConfigStore()
const journalStore = useJournalStore()

// ponytail: dialog 按钮顺序：操作(positive)靠左、取消(negative)靠右，整体居中
// naive UI 默认 DOM 顺序 [negative, positive]，row-reverse 反转视觉 + center 居中 + gap 补间距
// （naive UI 用 margin-right 控间距，row-reverse 下失效，故显式 gap）
const REVERSE_ACTION = 'flex-direction: row-reverse; justify-content: center; gap: 12px !important;'

const trashCount = computed(() => store.trash.length)
const petCount = computed(() => settingsStore.trashPets.length)
const interviewCount = computed(() => interviewStore.trash.length)
const aiConfigCount = computed(() => aiConfigStore.trash.length)
// 手账回收站可见条目：记事本全部显示；笔记仅显示「单独删的」——
// 随记事本连带删的笔记（parentId 指向某 trash 记事本且 deletedAt 与之相同）不单独显示，
// 恢复记事本时连带恢复。先删笔记后删记事本时，笔记 deletedAt 与记事本不同，仍单独显示。
const visibleJournalTrash = computed(() => {
  const trashedNotebooks = journalStore.trash.filter(e => e.type === 'notebook')
  return journalStore.trash.filter(e => {
    if (e.type === 'notebook') return true
    // note：排除随记事本连带删的
    const parentDeletedWith = trashedNotebooks.find(n => n.id === e.parentId)
    if (parentDeletedWith && parentDeletedWith.deletedAt === e.deletedAt) return false
    return true
  })
})
const journalCount = computed(() => visibleJournalTrash.value.length)
const totalCount = computed(() => trashCount.value + petCount.value + interviewCount.value + aiConfigCount.value + journalCount.value)

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

const trashPetsWithRemainingDays = computed(() => {
  return settingsStore.trashPets.map(pet => {
    const deletedAt = pet.deletedAt ? new Date(pet.deletedAt).getTime() : Date.now()
    const cutoff = Date.now() + store.trashRetentionDays * 24 * 60 * 60 * 1000
    const remainingMs = cutoff - deletedAt
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
    return { ...pet, remainingDays }
  })
})

// 面试回收站剩余天数（复用简历保留天数配置）
const trashInterviewsWithRemainingDays = computed(() => {
  return interviewStore.trash.map(interview => {
    const deletedAt = interview.deletedAt ? new Date(interview.deletedAt).getTime() : Date.now()
    const cutoff = Date.now() + store.trashRetentionDays * 24 * 60 * 60 * 1000
    const remainingMs = cutoff - deletedAt
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
    return { ...interview, remainingDays }
  })
})

// AI 配置回收站剩余天数（复用简历保留天数配置）
const trashAIConfigsWithRemainingDays = computed(() => {
  return aiConfigStore.trash.map(config => {
    const deletedAt = config.deletedAt ? new Date(config.deletedAt).getTime() : Date.now()
    const cutoff = Date.now() + store.trashRetentionDays * 24 * 60 * 60 * 1000
    const remainingMs = cutoff - deletedAt
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
    return { ...config, remainingDays }
  })
})

// 手账回收站剩余天数（可见条目；复用 journalStore 保留天数配置）
const trashJournalsWithRemainingDays = computed(() => {
  return visibleJournalTrash.value
    .map(journal => {
      const deletedAt = journal.deletedAt ? new Date(journal.deletedAt).getTime() : Date.now()
      const cutoff = Date.now() + journalStore.trashRetentionDays * 24 * 60 * 60 * 1000
      const remainingMs = cutoff - deletedAt
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
      return { ...journal, remainingDays }
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
    actionStyle: REVERSE_ACTION,
    // ponytail: 不 await 持久化——store 已同步更新响应式状态，弹窗立即关闭，写盘后台进行
    onPositiveClick: () => {
      store.restoreResume(id).catch(e => console.error('[TrashPanel] restoreResume:', e))
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
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      store.permanentDeleteResume(id).catch(e => console.error('[TrashPanel] permanentDeleteResume:', e))
    },
  })
}

// 恢复面试
const handleRestoreInterview = (id: string) => {
  const interview = interviewStore.trash.find(i => i.id === id)
  dialog.success({
    title: '恢复面试记录',
    content: `确定要恢复「${interview?.company || '未填写公司'}」吗？`,
    positiveText: '恢复',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      interviewStore.restoreInterview(id).catch(e => console.error('[TrashPanel] restoreInterview:', e))
    },
  })
}

// 永久删除面试
const handlePermanentDeleteInterview = (id: string) => {
  const interview = interviewStore.trash.find(i => i.id === id)
  dialog.warning({
    title: '永久删除',
    content: `确定要永久删除「${interview?.company || '这个面试记录'}」吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      interviewStore.permanentDeleteInterview(id).catch(e => console.error('[TrashPanel] permanentDeleteInterview:', e))
    },
  })
}

// 恢复 AI 配置
const handleRestoreAIConfig = (id: string) => {
  const config = aiConfigStore.trash.find(c => c.id === id)
  dialog.success({
    title: '恢复 AI 服务配置',
    content: `确定要恢复「${config?.name || '这个配置'}」吗？`,
    positiveText: '恢复',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      aiConfigStore.restoreConfig(id).catch(e => console.error('[TrashPanel] restoreConfig:', e))
    },
  })
}

// 永久删除 AI 配置（含历史用量）
const handlePermanentDeleteAIConfig = (id: string) => {
  const config = aiConfigStore.trash.find(c => c.id === id)
  dialog.warning({
    title: '永久删除',
    content: `确定要永久删除「${config?.name || '这个配置'}」吗？历史用量将一并清除，此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      aiConfigStore.permanentDeleteConfig(id).catch(e => console.error('[TrashPanel] permanentDeleteConfig:', e))
    },
  })
}

// 恢复手账条目（记事本连带恢复其下子笔记；独立笔记单独恢复）
const handleRestoreJournal = (id: string) => {
  const entry = journalStore.trash.find(e => e.id === id)
  const isNotebook = entry?.type === 'notebook'
  dialog.success({
    title: '恢复手账',
    content: isNotebook
      ? `确定要恢复记事本「${entry?.title || '未命名'}」吗？其中的笔记会一并恢复。`
      : `确定要恢复笔记「${entry?.title || '未命名'}」吗？`,
    positiveText: '恢复',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      journalStore.restoreEntry(id).catch(e => console.error('[TrashPanel] restoreEntry:', e))
    },
  })
}

// 永久删除手账条目（记事本连同 trash 中其子笔记的 meta 记录；独立笔记单删）
const handlePermanentDeleteJournal = (id: string) => {
  const entry = journalStore.trash.find(e => e.id === id)
  const isNotebook = entry?.type === 'notebook'
  dialog.warning({
    title: '永久删除',
    content: isNotebook
      ? `确定要永久删除记事本「${entry?.title || '未命名'}」吗？其中的笔记将一并清除，此操作不可撤销。`
      : `确定要永久删除笔记「${entry?.title || '未命名'}」吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: REVERSE_ACTION,
    onPositiveClick: () => {
      journalStore.permanentDeleteEntry(id).catch(e => console.error('[TrashPanel] permanentDeleteEntry:', e))
    },
  })
}

// ========== 桌宠弹窗状态（自定义 spin 按钮，主线程阻塞期 spin 由合成线程驱动仍可转） ==========
const showRestorePetModal = ref(false)
const restoringPetId = ref<string | null>(null)
const restorePetTarget = computed(() => settingsStore.trashPets.find(p => p.id === restoringPetId.value))

const showPurgePetModal = ref(false)
const purgingPetId = ref<string | null>(null)
const purgePetTarget = computed(() => settingsStore.trashPets.find(p => p.id === purgingPetId.value))

const showEmptyTrashModal = ref(false)
// ponytail: 操作进行中显示 spin；store 先更新内存再 fire-and-forget，await 极短但仍留出 spin 反馈
const actionPending = ref(false)

// 恢复桌宠
const handleRestorePet = (id: string) => {
  restoringPetId.value = id
  showRestorePetModal.value = true
}
const confirmRestorePet = async () => {
  const id = restoringPetId.value
  if (!id || actionPending.value) return
  actionPending.value = true
  try {
    await settingsStore.restorePet(id)
  } catch (e) {
    console.error('[TrashPanel] restorePet:', e)
  } finally {
    showRestorePetModal.value = false
    restoringPetId.value = null
    actionPending.value = false
  }
}

// 永久删除桌宠
const handlePermanentDeletePet = (id: string) => {
  purgingPetId.value = id
  showPurgePetModal.value = true
}
const confirmPurgePet = async () => {
  const id = purgingPetId.value
  if (!id || actionPending.value) return
  actionPending.value = true
  try {
    await settingsStore.purgePet(id)
  } catch (e) {
    console.error('[TrashPanel] purgePet:', e)
  } finally {
    showPurgePetModal.value = false
    purgingPetId.value = null
    actionPending.value = false
  }
}

// 清空回收站（简历 + 桌宠）
const handleEmptyTrash = () => {
  showEmptyTrashModal.value = true
}
// 四个 store 均先清内存、落盘 fire-and-forget（各自 store 内 catch），UI 立即关闭
const confirmEmptyTrash = () => {
  if (actionPending.value) return
  store.emptyTrash()
  settingsStore.emptyTrashPets()
  interviewStore.emptyTrash()
  aiConfigStore.emptyTrash()
  journalStore.emptyTrash()
  showEmptyTrashModal.value = false
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
    gap: $spacing-lg;
    padding: $spacing-sm;
  }
}

// 回收站分区
.trash-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: $text-secondary;
    margin: 0;
    padding: 0 $spacing-sm;
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

    &--pet {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }
  }

  &__meta-wrap {
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

// 弹窗自定义 action 按钮（对齐 SettingsPanel action-btn 风格，spin 由 CSS 合成线程驱动）
.trash-modal-actions {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  width: 100%;
  padding-top: $spacing-md;
}

.trash-modal-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: 1px solid transparent;
  font-family: $font-family;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &--primary {
    background: $primary-color;
    color: #fff;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  &--danger {
    background: rgba($error-color, 0.12);
    color: $error-color;
    border-color: rgba($error-color, 0.25);
  }

  &--ghost {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
    border-color: var(--border-glass);
  }
}

.is-spin-trash {
  animation: trash-spin 0.8s linear infinite;
}

@keyframes trash-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>