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
        :style-overrides="resumeStyleOverrides"
        :preview-resume-data="isChangingTemplate ? store.currentResume ?? undefined : undefined"
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
import { applyTemplateToCurrentResume } from '@/utils/templateApply'
import TemplateCard from '@/components/template/TemplateCard.vue'

const route = useRoute()
const router = useRouter()
const store = useResumeStore()

const templates = TEMPLATES.filter(t => t.id !== 'blank')
const selectedId = ref('sidebar')

const resumeId = computed(() => route.params.id as string)

// 判断是否为"更换模板"模式（非空简历进入模板选择页）
const isChangingTemplate = ref(false)

onMounted(async () => {
  // 等待 store 初始化完成，确保 resumeList 已加载
  await store.ready
  // 加载简历数据
  if (resumeId.value) {
    const loaded = await store.loadResume(resumeId.value)
    if (loaded && store.currentResume) {
      selectedId.value = store.currentResume.templateId || 'sidebar'
      // 有内容的简历 → 更换模板模式，预览使用当前简历样式
      const r = store.currentResume
      isChangingTemplate.value = !!(r.basicInfo.name ||
        r.workExperience.length > 0 ||
        r.education.length > 0)
    }
  }
})

// 提取当前简历的样式覆盖，传给 TemplateCard 预览
const resumeStyleOverrides = computed(() => {
  if (!isChangingTemplate.value || !store.currentResume) return undefined
  const r = store.currentResume
  return {
    ...(r.themeAccentColor && { themeAccentColor: r.themeAccentColor }),
    ...(r.headerTextColor && { headerTextColor: r.headerTextColor }),
    ...(r.headerIconColor && { headerIconColor: r.headerIconColor }),
    ...(r.fontFamily && { fontFamily: r.fontFamily }),
    ...(r.bodyFontSize && { bodyFontSize: r.bodyFontSize }),
    ...(r.sectionTitleFontSize && { sectionTitleFontSize: r.sectionTitleFontSize }),
    ...(r.entryTitleFontSize && { entryTitleFontSize: r.entryTitleFontSize }),
    ...(r.lineHeight && { lineHeight: r.lineHeight }),
    ...(r.pagePadding != null && { pagePadding: r.pagePadding }),
  }
})

const goBack = async () => {
  // 判断简历是否为空（从首页新建但未选择模板）
  const resume = store.currentResume
  const isEmpty = !resume?.basicInfo.name &&
                  resume?.workExperience.length === 0 &&
                  resume?.education.length === 0 &&
                  resume?.projects.length === 0 &&
                  resume?.skills.length === 0

  if (isEmpty) {
    // 删除空简历，返回首页
    await store.deleteResume(resumeId.value)
    router.push('/')
  } else {
    // 返回编辑器
    router.push(`/editor/${resumeId.value}`)
  }
}

const applyTemplate = async () => {
  const resume = store.currentResume

  // 判断简历是否为空（无姓名、无工作经历、无教育经历）
  const isEmpty = !resume?.basicInfo.name &&
                  resume?.workExperience.length === 0 &&
                  resume?.education.length === 0

  if (isEmpty) {
    // 第一次选择模板：使用共享函数应用模板 + 示例数据
    applyTemplateToCurrentResume(selectedId.value)
  } else {
    // 已有内容：只更新模板，不改变主题色和文字设置
    store.updateCurrentResume({
      templateId: selectedId.value,
    })
  }

  // 等待保存完成后再跳转，确保 resumeList 已同步更新
  await store.saveCurrentResumeNow()
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
    background: var(--header-bg);
    border-bottom: 1px solid var(--border-light);
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
  border: 1px solid var(--border-glass);
  color: $text-secondary;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  cursor: pointer;
  font-size: $font-size-sm;
  transition: all $transition-base;

  &:hover {
    color: $text-primary;
    border-color: var(--border-hover);
    background: var(--hover-bg);
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