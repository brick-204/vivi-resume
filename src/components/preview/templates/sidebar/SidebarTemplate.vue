<template>
  <div class="resume-document resume--sidebar" :style="ctx.sidebarCSSVars.value">
    <SidebarAside @click-section="(s: string, i?: string) => emit('click-section', s, i)" />
    <main class="sidebar__right">
      <AnimatedSidebarSectionList
        :sections="ctx.sidebarContentSections.value"
        @click-section="(s: string, i?: string) => emit('click-section', s, i)"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { Resume } from '@/types/resume'
import { useResumeDocument } from '../shared/useResumeDocument'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import SidebarAside from './sections/SidebarAside.vue'
import AnimatedSidebarSectionList from '../shared/AnimatedSidebarSectionList.vue'

const props = defineProps<{ resume: Resume }>()
const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()

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
  color: var(--sidebar-name-color);
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}

:deep(.sidebar__title) {
  font-size: 12px;
  color: var(--sidebar-title-color);
  font-weight: 500;
}

:deep(.sidebar__fields) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

:deep(.sidebar__field) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--sidebar-field-color);
  word-break: break-all;
  position: relative;
}

:deep(.sidebar__field-icon) {
  display: flex;
  flex-shrink: 0;
  color: var(--sidebar-accent);
}

:deep(.sidebar__field-label) {
  color: var(--sidebar-field-color);
  font-weight: 500;

  &::after {
    content: ':';
    margin-left: 1px;
  }
}

:deep(.sidebar__field-value) {
  color: var(--sidebar-name-color);
}

:deep(.sidebar__section-title) {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--sidebar-name-color);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.sidebar__section-line) {
  width: 16px;
  height: 2px;
  background: var(--sidebar-accent);
  border-radius: 1px;
}

:deep(.sidebar__skill-text) {
  font-size: 11px;
  color: var(--sidebar-name-color);
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
  color: var(--sidebar-name-color);
  padding-bottom: 8px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 2px solid var(--sidebar-accent);
  position: relative;
}

:deep(.main__section-icon) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sidebar-accent);
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
  border-bottom: 1px solid var(--sidebar-entry-border);

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
  background: var(--sidebar-accent);
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
    background: var(--sidebar-highlight-dot);
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
  background: var(--t-tag-bg);
  color: var(--t-tag-color);
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  border: 1px solid var(--t-tag-border);
}
</style>