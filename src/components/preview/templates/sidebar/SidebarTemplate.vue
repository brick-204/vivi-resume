<template>
  <div class="resume-document resume--sidebar" :style="ctx.sidebarCSSVars.value">
    <SidebarAside @click-section="$emit('click-section', $event)" />
    <main class="sidebar__right">
      <template v-for="sectionId in ctx.sidebarContentSections.value" :key="sectionId">
        <SidebarSummarySection v-if="sectionId === 'summary'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
        <SidebarWorkSection v-else-if="sectionId === 'work'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
        <SidebarEducationSection v-else-if="sectionId === 'education'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
        <SidebarProjectsSection v-else-if="sectionId === 'projects'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
        <SidebarEvaluationSection v-else-if="sectionId === 'evaluation'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
        <SidebarCustomTextSection v-else-if="sectionId.startsWith('customText_')" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
        <SidebarCustomCardSection v-else-if="sectionId.startsWith('customCard_')" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { Resume } from '@/types/resume'
import { useResumeDocument } from '../shared/useResumeDocument'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import SidebarAside from './sections/SidebarAside.vue'
import SidebarSummarySection from './sections/SidebarSummarySection.vue'
import SidebarWorkSection from './sections/SidebarWorkSection.vue'
import SidebarEducationSection from './sections/SidebarEducationSection.vue'
import SidebarProjectsSection from './sections/SidebarProjectsSection.vue'
import SidebarEvaluationSection from './sections/SidebarEvaluationSection.vue'
import SidebarCustomTextSection from './sections/SidebarCustomTextSection.vue'
import SidebarCustomCardSection from './sections/SidebarCustomCardSection.vue'

const props = defineProps<{ resume: Resume }>()
defineEmits<{ 'click-section': [tabId: string] }>()

const ctx = useResumeDocument(() => props.resume, 'sidebar')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--sidebar {
  display: grid;
  grid-template-columns: 240px 1fr;
  max-width: 800px;
  min-height: 1050px;
  padding: 0;
  overflow: hidden;
  font-size: 13px;
}

// 左侧边栏
:deep(.sidebar__left) {
  background: var(--sidebar-bg);
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--sidebar-text);
}

:deep(.sidebar__photo-wrapper) {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

:deep(.sidebar__photo) {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.4);
}

:deep(.sidebar__photo-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:deep(.sidebar__photo-placeholder) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.sidebar__identity) {
  text-align: center;
}

:deep(.sidebar__name) {
  font-size: 18px;
  font-weight: 800;
  color: #1e3a5f;
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}

:deep(.sidebar__title) {
  font-size: 12px;
  color: #3b6ba5;
  font-weight: 500;
}

:deep(.sidebar__fields) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.sidebar__field) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #2d5a8e;
  word-break: break-all;
}

:deep(.sidebar__field-icon) {
  display: flex;
  flex-shrink: 0;
  color: #3b82f6;
}

:deep(.sidebar__field-label) {
  color: #2d5a8e;
  font-weight: 500;

  &::after {
    content: ':';
    margin-left: 1px;
  }
}

:deep(.sidebar__field-value) {
  color: #1e3a5f;
}

:deep(.sidebar__section-title) {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #1e3a5f;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.sidebar__section-line) {
  width: 16px;
  height: 2px;
  background: #3b82f6;
  border-radius: 1px;
}

:deep(.sidebar__skill-text) {
  font-size: 11px;
  color: #1e3a5f;
  line-height: 1.8;

  @include rich-text-content;
}

// 右侧主内容区
:deep(.sidebar__right) {
  padding: 28px 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

:deep(.sidebar__section) {
  margin-bottom: 0;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }
}

:deep(.main__section-title) {
  font-size: 14px;
  font-weight: 700;
  color: #1e3a5f;
  padding-bottom: 8px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 2px solid #3b82f6;
  position: relative;
}

:deep(.main__section-icon) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
}

:deep(.main__section-text) {
  font-size: 12px;
  color: #4a5568;
  line-height: 1.8;

  @include rich-text-content;
}

:deep(.main__entry) {
  margin-top: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f5;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
}

:deep(.main__entry-header) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}

:deep(.main__entry-info) {
  display: flex;
  flex-direction: column;
}

:deep(.main__entry-title) {
  font-size: 13px;
  font-weight: 700;
  color: #1a202c;
}

:deep(.main__entry-subtitle) {
  font-size: 11px;
  color: #718096;
}

:deep(.main__entry-date) {
  font-size: 10px;
  color: #ffffff;
  background: #3b82f6;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
}

:deep(.main__entry-desc) {
  font-size: 11px;
  color: #4a5568;
  line-height: 1.7;
  margin-top: 6px;

  @include rich-text-content;
}

:deep(.main__entry-highlights) {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.main__entry-highlights li) {
  font-size: 11px;
  color: #4a5568;
  line-height: 1.6;
  padding-left: 14px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 7px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #93c5fd;
  }
}

:deep(.main__entry-tags) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

:deep(.main__tech-tag) {
  padding: 2px 10px;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  border: 1px solid rgba(59, 130, 246, 0.15);
}
</style>