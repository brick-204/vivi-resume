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
  // 不覆盖 base.scss 的 padding: var(--page-padding)
  // professional 的 24px 0 padding 已移除，由 --page-padding CSS var 统一控制
  padding: var(--page-padding, 48px) var(--page-padding, 48px) var(--page-padding, 48px) 0;

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
    font-size: var(--t-entry-date-font-size, 11pt);
    white-space: nowrap;
  }

  // 技术标签：紧凑方角，匹配商务正式风格
  :deep(.tech-tag) {
    padding: 1px 8px;
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 2px;
    font-size: var(--t-tag-font-size, 10pt);
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  :deep(.entry__tags) {
    gap: 4px;
    margin-top: 6px;
  }
}
</style>
