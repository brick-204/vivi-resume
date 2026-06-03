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
  font-size: var(--t-body-font-size, 13px);
  font-family: var(--t-font-family, $font-family);
}

// 左侧边栏
:deep(.sidebar__left) {
  background: var(--sidebar-bg);
  padding: 16px 10px;
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

:deep(.sidebar__photo-wrapper--left) {
  justify-content: flex-start;
  padding-top: 0;
}

:deep(.sidebar__photo-wrapper--row) {
  justify-content: flex-start;
  padding-top: 0;
}

:deep(.sidebar__left--photo-right .sidebar__header-row) {
  flex-direction: row-reverse;
}

:deep(.sidebar__left--photo-right .sidebar__identity) {
  text-align: right;
}

:deep(.sidebar__header-row) {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.sidebar__photo) {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.sidebar__photo--rectangle) {
  width: 60px;
  height: 80px;
  border-radius: 0;
}

:deep(.sidebar__photo-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

:deep(.sidebar__photo-placeholder) {
  color: rgba(0, 0, 0, 0.25);
}

:deep(.sidebar__identity) {
  text-align: center;
}

:deep(.sidebar__header-row .sidebar__identity) {
  text-align: left;
}

:deep(.sidebar__left--photo-right .sidebar__identity) {
  text-align: right;
}

:deep(.sidebar__name) {
  font-size: 32px;
  font-weight: 800;
  color: #202429;
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}

:deep(.sidebar__title) {
  font-size: 18px;
  color: #202429;
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
  align-items: flex-start;
  gap: 8px;
  font-size: var(--t-body-font-size, 14px);
  position: relative;
  min-width: 0;
}

:deep(.sidebar__field-prefix) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

:deep(.sidebar__field-icon) {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--sidebar-basic-icon-color, #202429);
  width: 1em;
  height: 1em;
}

:deep(.sidebar__field-label) {
  color: var(--sidebar-basic-field-color, #202429);
  font-weight: 500;
  flex-shrink: 0;

  &::after {
    content: ':';
    margin-left: 1px;
  }
}

:deep(.sidebar__field-value) {
  color: var(--sidebar-basic-field-color, #202429);
  min-width: 0;
  flex: 1;
  word-break: break-word;
  overflow-wrap: anywhere;
}

:deep(.sidebar__section-title) {
  font-size: var(--sidebar-section-title-font-size, 11px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--sidebar-text);
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
  font-size: var(--sidebar-skill-font-size, 11px);
  color: var(--sidebar-text);
  line-height: 1.8;

  @include rich-text-content;
}

// 右侧主内容区
:deep(.sidebar__right) {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

:deep(.sidebar__section) {
  margin-bottom: 0;
  cursor: pointer;
  transition: opacity 0.15s;
  content-visibility: auto;
  contain-intrinsic-size: auto 200px;

  &:hover {
    opacity: 0.85;
  }
}

:deep(.main__section-title) {
  font-size: var(--t-section-title-font-size, 14px);
  font-weight: 700;
  color: var(--sidebar-text);
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
  font-size: var(--t-section-text-font-size, 12px);
  color: var(--t-text, #202429);
  line-height: 1.8;

  @include rich-text-content;
}

:deep(.main__entry) {
  margin-top: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--sidebar-entry-border);
  content-visibility: auto;
  contain-intrinsic-size: auto 80px;

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
  font-size: var(--t-entry-title-font-size, 13px);
  font-weight: 700;
  color: var(--t-text, #202429);
}

:deep(.main__entry-subtitle) {
  font-size: var(--t-entry-subtitle-font-size, 11px);
  color: #202429;
}

:deep(.main__entry-date) {
  font-size: var(--t-entry-date-font-size, 10px);
  color: #ffffff;
  background: var(--sidebar-accent);
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
}

:deep(.main__entry-desc) {
  font-size: var(--t-entry-desc-font-size, 11px);
  color: var(--t-text, #202429);
  line-height: 1.7;
  margin-top: 6px;

  @include rich-text-content;
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
  font-size: var(--t-tag-font-size, 10px);
  font-weight: 500;
  border: 1px solid var(--t-tag-border);
}
</style>