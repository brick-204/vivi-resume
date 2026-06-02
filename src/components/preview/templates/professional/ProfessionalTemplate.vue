<template>
  <div class="resume-document resume--professional" :style="ctx.templateCSSVars.value">
    <BasicHeader @click-section="(s: string, i?: string) => emit('click-section', s, i)" />
    <ProfessionalAnimatedSectionList
      :sections="ctx.contentSections.value"
      @click-section="(s: string, i?: string) => emit('click-section', s, i)"
    />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { Resume } from '@/types/resume'
import { useResumeDocument } from '../shared/useResumeDocument'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import BasicHeader from '../shared/sections/BasicHeader.vue'
import ProfessionalAnimatedSectionList from './ProfessionalAnimatedSectionList.vue'

const props = defineProps<{ resume: Resume }>()
const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()

const ctx = useResumeDocument(() => props.resume, 'professional')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--professional {
  padding: 24px 0;

  // 隐藏默认 header 底部装饰线
  :deep(.resume__header) {
    &::after {
      display: none;
    }
  }

  // 隐藏默认时间线
  :deep(.entry__timeline) {
    display: none;
  }

  // 条目内容占满宽度（无时间线时）
  :deep(.entry__content) {
    flex: 1;
  }

  // entry__date 去掉 border/background/padding，恢复为纯文本
  :deep(.entry__date) {
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    font-size: 11pt;
    white-space: nowrap;
  }
}
</style>
