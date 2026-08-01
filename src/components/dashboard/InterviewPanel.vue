<template>
  <div class="interview-panel">
    <!-- 顶部标题 + 操作按钮 -->
    <div class="interview-panel__header">
      <h2 class="interview-panel__title">
        <Icon icon="mdi:briefcase-outline" :width="24" />
        我的面试
        <span v-if="interviews.length > 0" class="interview-panel__count">{{ interviews.length }}</span>
      </h2>
      <div class="interview-panel__actions">
        <button class="action-btn action-btn--primary" @click="showCreate = true">
          <Icon icon="mdi:plus" :width="18" />
          新建面试
        </button>
        <button class="action-btn action-btn--secondary" @click="openAIPanel(null, 'mockInterview')">
          <Icon icon="mdi:robot-outline" :width="18" />
          AI 助手
        </button>
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
        <h3 class="interview-panel__segment-title">
          即将面试
          <span class="interview-panel__segment-count">{{ upcomingInterviews.length }}</span>
        </h3>
        <div class="interview-panel__grid">
          <InterviewCard
            v-for="i in upcomingInterviews"
            :key="i.id"
            :interview="i"
            @edit="onEdit(i.id)"
            @delete="onDelete(i.id)"
            @ai="openAIPanel(i.id, 'mockInterview')"
          />
        </div>
      </section>

      <section v-if="ongoingInterviews.length > 0" class="interview-panel__segment">
        <h3 class="interview-panel__segment-title">
          进行中
          <span class="interview-panel__segment-count">{{ ongoingInterviews.length }}</span>
        </h3>
        <div class="interview-panel__grid">
          <InterviewCard
            v-for="i in ongoingInterviews"
            :key="i.id"
            :interview="i"
            @edit="onEdit(i.id)"
            @delete="onDelete(i.id)"
            @ai="openAIPanel(i.id, 'mockInterview')"
          />
        </div>
      </section>

      <section v-if="endedInterviews.length > 0" class="interview-panel__segment">
        <h3 class="interview-panel__segment-title">
          已结束
          <span class="interview-panel__segment-count">{{ endedInterviews.length }}</span>
        </h3>
        <div class="interview-panel__grid">
          <InterviewCard
            v-for="i in endedInterviews"
            :key="i.id"
            :interview="i"
            @edit="onEdit(i.id)"
            @delete="onDelete(i.id)"
            @ai="openAIPanel(i.id, 'mockInterview')"
          />
        </div>
      </section>
    </template>

    <!-- 新建方式选择 -->
    <InterviewCreateModal
      :visible="showCreate"
      @close="showCreate = false"
      @create="handleCreateMode"
    />

    <!-- 编辑/新建表单 -->
    <InterviewFormModal
      :visible="showForm"
      :interview-id="editingId"
      @close="showForm = false"
      @saved="showForm = false"
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
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useInterviewStore } from '@/stores/interviewStore'
import { message as naiveMessage, dialog } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import InterviewCard from '@/components/dashboard/InterviewCard.vue'
import InterviewCreateModal from '@/components/dashboard/InterviewCreateModal.vue'
import InterviewFormModal from '@/components/dashboard/InterviewFormModal.vue'
import InterviewAIPanel from '@/components/dashboard/InterviewAIPanel.vue'

const store = useInterviewStore()
const { interviews, upcomingInterviews, ongoingInterviews, endedInterviews } = storeToRefs(store)

// 本地模态框状态
const showCreate = ref(false)
const showForm = ref(false)
const editingId = ref<string | null>(null)

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
    editingId.value = null
    showForm.value = true
  }
}

const onEdit = (id: string) => {
  editingId.value = id
  showForm.value = true
}

const onDelete = (id: string) => {
  dialog.warning({
    title: '删除面试记录',
    content: '确定要删除这条面试记录吗？此操作不可恢复',
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: 'justify-content: center',
    onPositiveClick: () => {
      store.deleteInterview(id)
    },
  })
}

const openAIPanel = (id: string | null, mode: 'mockInterview' | 'review' | 'parseJd') => {
  aiInterviewId.value = id
  aiMode.value = mode
  showAIPanel.value = true
}

const handleParsedJd = (fields: { company: string; position: string; salary: string; location: string; jd: string }) => {
  showAIPanel.value = false
  // ponytail: 最简方案——用解析字段新建一条 interview 并打开编辑
  const newId = store.createInterview(fields)
  naiveMessage.success('JD 解析成功，请补充信息')
  editingId.value = newId
  showForm.value = true
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
