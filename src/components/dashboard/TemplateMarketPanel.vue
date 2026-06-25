<template>
  <div class="template-market-panel">
    <!-- 顶部标题 -->
    <div class="template-market-panel__header">
      <div>
        <h2 class="template-market-panel__title">
          <Icon icon="mdi:view-grid-outline" :width="24" />
          模版市场
        </h2>
        <p class="template-market-panel__desc">选择一个模板开始创建你的简历</p>
      </div>
    </div>

    <!-- 模板网格 -->
    <div class="template-market-panel__grid">
      <TemplateShowcaseCard
        v-for="template in templates"
        :key="template.id"
        :template="template"
        :preview-resume-data="userResume"
        @use="handleUseTemplate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { TEMPLATES } from '@/config/templates'
import { createResumeFromTemplateDeferred, createBlankResumeDeferred } from '@/utils/templateApply'
import { useResumeStore } from '@/stores/resumeStore'
import { message as naiveMessage } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import TemplateShowcaseCard from './TemplateShowcaseCard.vue'

const router = useRouter()
const store = useResumeStore()
const templates = TEMPLATES

// 如果用户已有简历，用第一份简历的数据预览模板
// 注意：使用 resumeList[0] 而非 currentResume，避免"使用模板"时 currentResume 变更
// 触发所有卡片预览数据重算导致视觉闪烁
const userResume = computed(() => store.resumeList[0] || undefined)

const handleUseTemplate = (templateId: string) => {
  try {
    if (templateId === 'blank') {
      // 空白模板：创建纯空白简历，直接跳转编辑器
      const id = createBlankResumeDeferred()
      router.push(`/editor/${id}`)
    } else {
      const id = createResumeFromTemplateDeferred(templateId)
      router.push(`/editor/${id}`)
    }
  } catch (e) {
    console.error('使用模板失败:', e)
    naiveMessage.error('创建简历失败，请重试')
  }
}
</script>

<style lang="scss" scoped>
.template-market-panel {
  &__header {
    margin-bottom: $spacing-xl;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-xl;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 $spacing-xs;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin: 0;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    grid-auto-rows: min-content;
    gap: $spacing-xl;
  }
}

// 响应式
@include tablet {
  .template-market-panel {
    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: $spacing-md;
    }
  }
}

@include mobile {
  .template-market-panel {
    &__grid {
      grid-template-columns: 1fr;
      gap: $spacing-md;
    }
  }
}
</style>