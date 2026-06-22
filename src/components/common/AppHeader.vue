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

    <!-- 右侧：编辑模式操作按钮 + 主题切换 -->
    <div class="app-header__right">
      <template v-if="showEditorRight">
        <n-dropdown :options="aiHelpOptions" @select="onAiHelpSelect" placement="bottom-end">
          <button class="header-btn header-btn--ai-help">
            <Icon icon="mdi:creation" :width="16" />
            <span class="header-btn__text">AI 帮帮</span>
            <Icon icon="mdi:chevron-down" :width="16" />
          </button>
        </n-dropdown>
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
      </template>

      <n-dropdown :options="themeOptions" @select="onThemeSelect" placement="bottom-end">
        <button class="app-header__theme-btn">
          <Icon :icon="themeIcon" :width="18" />
        </button>
      </n-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useResumeStore } from '@/stores/resumeStore'
import { getTemplate } from '@/config/templates'
import { useTheme } from '@/composables/useTheme'
import type { ThemeMode } from '@/composables/useTheme'

defineProps<{
  /** 是否显示编辑模式中间区域（简历名称输入框 + 模板标签） */
  showEditorCenter?: boolean
  /** 是否显示编辑模式右侧区域（AI 评估、更换模板、导出下拉） */
  showEditorRight?: boolean
}>()

const emit = defineEmits<{
  'export-json': []
  'export-pdf': []
  'export-image': []
  'ai-eval': []
  'jd-scan': []
  'full-optimize': []
  'interview-prep': []
  'change-template': []
  'save-title': []
}>()

const store = useResumeStore()
const { mode, resolvedTheme, setMode } = useTheme()

const resumeTitle = computed({
  get: () => store.currentResume?.title || '',
  set: (value) => store.updateCurrentResume({ title: value })
})

const templateName = computed(() => {
  const id = store.currentResume?.templateId
  return id ? getTemplate(id).name : ''
})

// 主题图标：浅色时显示月亮（可切换到深色），深色时显示太阳（可切换到浅色）
const themeIcon = computed(() => {
  return resolvedTheme.value === 'dark' ? 'mdi:white-balance-sunny' : 'mdi:moon-waning-crescent'
})

// 主题下拉选项（当前选中项加 ✓ 标识）
const themeOptions = computed<DropdownOption[]>(() => [
  { label: mode.value === 'light' ? '✓ ☀️ 浅色模式' : '☀️ 浅色模式', key: 'light' },
  { label: mode.value === 'dark' ? '✓ 🌙 深色模式' : '🌙 深色模式', key: 'dark' },
  { label: mode.value === 'system' ? '✓ 💻 跟随系统' : '💻 跟随系统', key: 'system' },
])

const onThemeSelect = (key: string) => {
  setMode(key as ThemeMode)
}

const aiHelpOptions: DropdownOption[] = [
  { label: 'AI 评估', key: 'eval', icon: () => h(Icon, { icon: 'mdi:star-outline', width: 18 }) },
  { label: 'JD 扫描', key: 'scan', icon: () => h(Icon, { icon: 'mdi:text-search', width: 18 }) },
  { label: '一键优化', key: 'optimize', icon: () => h(Icon, { icon: 'mdi:creation', width: 18 }) },
  { label: '面试准备', key: 'interview-prep', icon: () => h(Icon, { icon: 'mdi:account-tie', width: 18 }) },
]

const onAiHelpSelect = (key: string) => {
  if (key === 'eval') emit('ai-eval')
  else if (key === 'scan') emit('jd-scan')
  else if (key === 'optimize') emit('full-optimize')
  else if (key === 'interview-prep') emit('interview-prep')
}

const exportOptions: DropdownOption[] = [
  { label: '导出 PDF', key: 'pdf', icon: () => h(Icon, { icon: 'mdi:file-pdf-box', width: 18 }) },
  { label: '导出图片', key: 'image', icon: () => h(Icon, { icon: 'mdi:image-outline', width: 18 }) },
  { label: '导出 JSON', key: 'json', icon: () => h(Icon, { icon: 'mdi:code-json', width: 18 }) },
]

const onExportSelect = (key: string) => {
  if (key === 'json') emit('export-json')
  else if (key === 'pdf') emit('export-pdf')
  else if (key === 'image') emit('export-image')
}
</script>

<style lang="scss" scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $header-height;
  padding: 0 $spacing-lg;
  background: var(--header-bg);
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
      background: var(--hover-bg);
      color: $text-primary;
    }

    &--active {
      background: $primary-bg-active;
      color: $text-white;
      box-shadow: $shadow-primary;

      &:hover {
        background: $primary-bg-active;
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
      box-shadow: 0 0 0 2px var(--focus-ring);
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

  &__theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: $radius-lg;
    border: 1px solid $border-glass;
    background: $bg-glass;
    color: $text-secondary;
    cursor: pointer;
    transition: all $transition-fast;
    flex-shrink: 0;

    &:hover {
      background: var(--hover-bg);
      color: $text-primary;
      border-color: var(--border-hover);
    }
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

  &--ai-help {
    background: linear-gradient(135deg, $primary-color, $accent-color);
    color: $text-white;
    border: none;
    box-shadow: $shadow-sm;

    &:hover {
      opacity: 0.9;
      box-shadow: $shadow-md;
    }
  }

  &--scan,
  &--template {
    background: $bg-glass;
    color: $text-secondary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
      color: $primary-light;
      border-color: $primary-color;
      box-shadow: $shadow-sm;
    }
  }

  &--export {
    background: $primary-color;
    color: $text-white;
    box-shadow: $shadow-sm;

    &:hover {
      background: $primary-light;
      box-shadow: $shadow-md;
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
