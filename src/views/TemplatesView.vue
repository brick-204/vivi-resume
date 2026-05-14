<template>
  <div class="templates-view">
    <!-- 顶部导航 -->
    <header class="templates-view__header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </button>
      <h1 class="templates-view__title">选择模板</h1>
      <button class="apply-btn" @click="applyTemplate">
        应用模板
      </button>
    </header>

    <!-- 模板网格 -->
    <main class="templates-view__grid">
      <TemplateCard
        v-for="template in templates"
        :key="template.id"
        :template="template"
        :selected="selectedId === template.id"
        @select="selectedId = $event"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResumeStore } from '@/stores/resumeStore'
import { TEMPLATES } from '@/config/templates'
import { getSampleResume } from '@/config/sampleData'
import TemplateCard from '@/components/template/TemplateCard.vue'

const route = useRoute()
const router = useRouter()
const store = useResumeStore()

const templates = TEMPLATES
const selectedId = ref('sidebar')

const resumeId = computed(() => route.params.id as string)

onMounted(() => {
  // 加载简历数据
  if (resumeId.value) {
    const loaded = store.loadResume(resumeId.value)
    if (loaded && store.currentResume) {
      selectedId.value = store.currentResume.templateId || 'sidebar'
    }
  }
})

const goBack = () => {
  // 返回编辑器
  router.push(`/editor/${resumeId.value}`)
}

const applyTemplate = () => {
  const resume = store.currentResume

  // 判断简历是否为空（无姓名、无工作经历、无教育经历）
  const isEmpty = !resume?.basicInfo.name &&
                  resume?.workExperience.length === 0 &&
                  resume?.education.length === 0

  if (isEmpty) {
    // 带入示例数据，让用户在此基础上修改
    const sampleData = getSampleResume()
    store.updateCurrentResume({
      templateId: selectedId.value,
      basicInfo: sampleData.basicInfo,
      workExperience: sampleData.workExperience,
      education: sampleData.education,
      projects: sampleData.projects,
      skills: sampleData.skills,
      selfEvaluation: sampleData.selfEvaluation
    })
  } else {
    // 只更新模板
    store.updateCurrentResume({ templateId: selectedId.value })
  }

  store.saveCurrentResume()
  router.push(`/editor/${resumeId.value}`)
}
</script>

<style lang="scss" scoped>
.templates-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-primary;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-md $spacing-xl;
    background: rgba($bg-primary, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    z-index: 10;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 700;
    color: $text-primary;
  }

  &__grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    grid-auto-rows: min-content;
    gap: $spacing-xl;
    padding: $spacing-xl;
    padding-bottom: $spacing-3xl;
    overflow-y: auto;
    align-content: start;
    @include scrollbar;
  }
}

.back-btn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: $text-secondary;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  cursor: pointer;
  font-size: $font-size-sm;
  transition: all $transition-base;

  &:hover {
    color: $text-primary;
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }
}

.apply-btn {
  @include button-primary;
  padding: $spacing-sm $spacing-xl;
  font-size: $font-size-sm;
  border-radius: $radius-md;
}

// 响应式
@include tablet {
  .templates-view {
    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: $spacing-md;
      padding: $spacing-lg;
    }
  }
}

@include mobile {
  .templates-view {
    &__grid {
      grid-template-columns: 1fr;
      padding: $spacing-md;
      gap: $spacing-md;
    }

    &__header {
      padding: $spacing-sm $spacing-md;
    }
  }
}
</style>