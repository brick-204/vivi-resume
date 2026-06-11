<template>
  <header class="app-header">
    <!-- 左侧：Logo + 导航标签 -->
    <div class="app-header__left">
      <slot name="left-extra" />
      <router-link to="/home" class="app-header__logo">
        <img src="/favicon.ico" alt="Vivi Resume" class="app-header__favicon" />
        <span class="app-header__logo-text">Vivi Resume</span>
      </router-link>
      <nav class="app-header__nav">
        <router-link to="/home" class="app-header__nav-tab" active-class="app-header__nav-tab--active">
          <Icon icon="mdi:home-outline" :width="16" />
          <span>首页</span>
        </router-link>
        <router-link to="/" class="app-header__nav-tab" active-class="app-header__nav-tab--active">
          <Icon icon="mdi:view-dashboard-outline" :width="16" />
          <span>控制台</span>
        </router-link>
      </nav>
    </div>

    <!-- 中间：编辑模式简历名称 -->
    <div v-if="showEditorCenter" class="app-header__center">
      <input
        v-model="resumeTitle"
        class="app-header__title-input"
        placeholder="给简历起个名字..."
        @blur="emit('save-title')"
      />
      <span v-if="templateName" class="app-header__template-badge">{{ templateName }}</span>
    </div>

    <!-- 右侧：编辑模式操作按钮 -->
    <div v-if="showEditorRight" class="app-header__right">
      <button class="header-btn header-btn--eval" @click="emit('ai-eval')">
        <Icon icon="mdi:star-outline" :width="16" />
        <span class="header-btn__text">AI 评估</span>
      </button>
      <button class="header-btn header-btn--template" @click="emit('change-template')">
        <Icon icon="mdi:view-grid-outline" :width="16" />
        <span class="header-btn__text">更换模板</span>
      </button>
      <n-dropdown :options="exportOptions" @select="onExportSelect" placement="bottom-end">
        <button class="header-btn header-btn--export">
          <Icon icon="mdi:download" :width="16" />
          <span class="header-btn__text">导出</span>
          <Icon icon="mdi:chevron-down" :width="16" />
        </button>
      </n-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useResumeStore } from '@/stores/resumeStore'
import { getTemplate } from '@/config/templates'

defineProps<{
  /** 是否显示编辑模式中间区域（简历名称输入框 + 模板标签） */
  showEditorCenter?: boolean
  /** 是否显示编辑模式右侧区域（AI 评估、更换模板、导出下拉） */
  showEditorRight?: boolean
}>()

const emit = defineEmits<{
  'export-json': []
  'export-pdf': []
  'ai-eval': []
  'change-template': []
  'save-title': []
}>()

const store = useResumeStore()

const resumeTitle = computed({
  get: () => store.currentResume?.title || '',
  set: (value) => store.updateCurrentResume({ title: value })
})

const templateName = computed(() => {
  const id = store.currentResume?.templateId
  return id ? getTemplate(id).name : ''
})

const exportOptions: DropdownOption[] = [
  { label: '导出 JSON', key: 'json' },
  { label: '导出 PDF', key: 'pdf' }
]

const onExportSelect = (key: string) => {
  if (key === 'json') emit('export-json')
  else if (key === 'pdf') emit('export-pdf')
}
</script>

<style lang="scss" scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $header-height;
  padding: 0 $spacing-lg;
  background: rgba($bg-primary, 0.8);
  backdrop-filter: blur(10px) saturate(1.8);
  -webkit-backdrop-filter: blur(10px) saturate(1.8);
  border-bottom: 1px solid $border-glass;
  z-index: 100;
  flex-shrink: 0;

  &__left {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    text-decoration: none;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.85;
    }
  }

  &__favicon {
    width: 28px;
    height: 28px;
    border-radius: $radius-sm;
    object-fit: contain;
  }

  &__logo-text {
    font-size: $font-size-lg;
    font-weight: 700;
    @include gradient-text;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }

  &__center {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    justify-content: center;
  }

  &__nav {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    background: $bg-glass;
    border-radius: $radius-xl;
    padding: $spacing-xs;
    border: 1px solid $border-glass;
  }

  &__nav-tab {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-lg;
    border-radius: $radius-lg;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-secondary;
    transition: all $transition-fast;
    text-decoration: none;
    white-space: nowrap;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      color: $text-primary;
    }

    &--active {
      background: $primary-gradient;
      color: $text-white;
      box-shadow: $shadow-primary;

      &:hover {
        background: $primary-gradient;
        color: $text-white;
      }
    }
  }

  &__title-input {
    border: none;
    background: transparent;
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-lg;
    min-width: 200px;
    max-width: 400px;
    transition: all $transition-fast;
    font-family: $font-family;
    text-align: center;

    &:focus {
      outline: none;
      background: $bg-glass;
      box-shadow: 0 0 0 2px rgba(124, 92, 252, 0.2);
    }

    &::placeholder {
      color: $text-light;
    }
  }

  &__template-badge {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 600;
    color: $text-light;
    background: $bg-glass;
    border-radius: $radius-sm;
    border: 1px solid $border-glass;
    user-select: none;
    white-space: nowrap;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: none;
  font-family: $font-family;
  white-space: nowrap;

  &--eval {
    background: $bg-glass;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    color: $text-secondary;
    border: 1px solid $border-glass;

    &:hover {
      background: rgba($primary-color, 0.08);
      color: $primary-light;
      border-color: $primary-color;
      box-shadow: 0 4px 20px rgba(124, 92, 252, 0.2);
    }
  }

  &--template {
    background: $bg-glass;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    color: $text-secondary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
      color: $text-primary;
      border-color: $primary-color;
      box-shadow: 0 4px 20px rgba(124, 92, 252, 0.15);
    }
  }

  &--export {
    background: $primary-gradient;
    color: $text-white;
    box-shadow: $shadow-primary;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(124, 92, 252, 0.4);
    }
  }
}

// 响应式
@include tablet {
  .app-header {
    &__nav-tab {
      padding: $spacing-sm $spacing-md;
    }
  }

  .header-btn__text {
    display: none;
  }
}

@include mobile {
  .app-header {
    padding: 0 $spacing-md;

    &__favicon {
      width: 24px;
      height: 24px;
    }

    &__logo-text {
      font-size: $font-size-md;
    }

    &__nav-tab {
      padding: $spacing-xs $spacing-md;
      font-size: $font-size-xs;

      span {
        display: none;
      }
    }

    &__title-input {
      min-width: 120px;
      max-width: 200px;
      font-size: $font-size-md;
    }
  }

  .header-btn__text {
    display: none;
  }
}
</style>
