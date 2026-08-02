<template>
  <header class="app-header">
    <!-- 左侧：Logo + 导航标签 -->
    <div class="app-header__left">
      <router-link to="/" class="app-header__logo">
        <img src="/favicon.ico" alt="Vivi Resume" class="app-header__favicon" />
        <span class="app-header__logo-text">Vivi Resume</span>
      </router-link>
      <nav class="app-header__nav">
        <router-link to="/" class="app-header__nav-tab" active-class="app-header__nav-tab--active">
          <Icon icon="mdi:home-outline" :width="16" />
          <span>首页</span>
        </router-link>
        <router-link to="/dashboard" class="app-header__nav-tab" active-class="app-header__nav-tab--active">
          <Icon icon="mdi:view-dashboard-outline" :width="16" />
          <span>控制台</span>
        </router-link>
        <router-link
          v-if="showEditorRight"
          :to="{ path: '/dashboard', query: { tab: 'interviews' } }"
          class="app-header__nav-tab"
        >
          <Icon icon="mdi:account-tie" :width="16" />
          <span>我的面试</span>
        </router-link>
      </nav>
    </div>

    <!-- 中间：编辑模式简历名称 / 非编辑模式滚动公告条 -->
    <div v-if="showEditorCenter" class="app-header__center">
      <input
        v-model="resumeTitle"
        class="app-header__title-input"
        placeholder="给简历起个名字..."
        @blur="emit('save-title')"
      />
      <span v-if="templateName" class="app-header__template-badge">{{ templateName }}</span>
    </div>
    <div v-else-if="!noticeDismissed" class="app-header__notice">
      <div class="app-header__marquee" role="status" aria-live="polite">
        <div class="app-header__marquee-track">
          <span class="app-header__marquee-text">{{ noticeText }}</span>
          <span class="app-header__marquee-text" aria-hidden="true">{{ noticeText }}</span>
        </div>
      </div>
      <label class="app-header__notice-dismiss" :title="'勾选后不再提示'">
        <input type="checkbox" v-model="noticeDismissed" />
        <span>知道🌶️</span>
      </label>
    </div>

    <!-- 右侧：编辑模式操作按钮 + 主题切换 -->
    <div class="app-header__right">
      <template v-if="showEditorRight">
        <n-dropdown :options="aiHelpOptions" placement="bottom-end" width="trigger" @select="onAiHelpSelect" @update:show="v => aiHelpOpen = v">
          <button class="header-btn header-btn--ai-help" aria-haspopup="true" :aria-expanded="aiHelpOpen" aria-label="AI 帮帮">
            <Icon icon="mdi:creation" :width="16" />
            <span class="header-btn__text">AI 帮帮</span>
            <Icon icon="mdi:chevron-down" :width="16" />
          </button>
        </n-dropdown>
        <button class="header-btn header-btn--template" @click="emit('change-template')">
          <Icon icon="mdi:view-grid-outline" :width="16" />
          <span class="header-btn__text">更换模板</span>
        </button>
        <n-dropdown :options="exportOptions" placement="bottom-end" @select="onExportSelect" @update:show="v => exportOpen = v">
          <button class="header-btn header-btn--export" aria-haspopup="true" :aria-expanded="exportOpen" aria-label="导出简历">
            <Icon icon="mdi:download" :width="16" />
            <span class="header-btn__text">导出</span>
            <Icon icon="mdi:chevron-down" :width="16" />
          </button>
        </n-dropdown>
      </template>

      <button
        class="app-header__theme-btn"
        :aria-pressed="soundEnabled"
        :aria-label="soundEnabled ? '关闭彩蛋音效' : '开启彩蛋音效'"
        :title="soundEnabled ? '彩蛋音效：开' : '彩蛋音效：关'"
        @click="toggleSound"
      >
        <Icon :icon="soundEnabled ? 'mdi:volume-high' : 'mdi:volume-mute'" :width="18" />
      </button>

      <n-dropdown :options="themeOptions" placement="bottom-end" @select="onThemeSelect" @update:show="v => themeOpen = v">
        <button class="app-header__theme-btn" aria-haspopup="true" :aria-expanded="themeOpen" aria-label="切换主题">
          <Icon :icon="themeIcon" :width="18" />
        </button>
      </n-dropdown>

      <a :href="githubUrl" target="_blank" rel="noopener noreferrer" class="app-header__github-btn" aria-label="GitHub 仓库">
        <Icon icon="mdi:github" :width="20" />
      </a>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useResumeStore } from '@/stores/resumeStore'
import { getTemplate } from '@/config/templates'
import { useTheme } from '@/composables/useTheme'
import type { ThemeMode } from '@/composables/useTheme'
import { useEasterEggSound } from '@/composables/useEasterEggSound'

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
  'export-docx': []
  'ai-eval': []
  'jd-scan': []
  'full-optimize': []
  'interview-prep': []
  'change-template': []
  'save-title': []
}>()

const store = useResumeStore()
const { mode, resolvedTheme, setMode } = useTheme()
const { soundEnabled, toggleSound } = useEasterEggSound()

// ponytail: 稳定常量直接内联，无需 config 层
const githubUrl = 'https://github.com/brick-204/vivi-resume'

// 关闭挽留提示：浏览器拦截离开 = 后台仍在落盘，强行关闭可能丢数据
const noticeText = '亲爱的用户，关闭或刷新页面时若浏览器弹窗挽留你，请一定要留下哦——后台正在为你保存数据，强行离开可能会丢失刚刚的修改～'

// 已读勾选：localStorage 持久化，勾选后整块公告条不再渲染
const NOTICE_DISMISSED_KEY = 'notice-close-warn-dismissed'
const noticeDismissed = ref(localStorage.getItem(NOTICE_DISMISSED_KEY) === '1')
watch(noticeDismissed, (v) => localStorage.setItem(NOTICE_DISMISSED_KEY, v ? '1' : '0'))

// 下拉菜单展开状态（供 aria-expanded 使用）
const aiHelpOpen = ref(false)
const exportOpen = ref(false)
const themeOpen = ref(false)

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
  { label: '导出 DOCX', key: 'docx', icon: () => h(Icon, { icon: 'mdi:file-word-outline', width: 18 }) },
  { label: '导出 JSON', key: 'json', icon: () => h(Icon, { icon: 'mdi:code-json', width: 18 }) },
]

const onExportSelect = (key: string) => {
  if (key === 'json') emit('export-json')
  else if (key === 'pdf') emit('export-pdf')
  else if (key === 'image') emit('export-image')
  else if (key === 'docx') emit('export-docx')
}
</script>

<style lang="scss" scoped>
@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

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
  position: sticky;
  top: 0;

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

  // Apple 风格：Logo 使用纯色
  &__logo-text {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    color: $primary-color;         // Action Blue
    letter-spacing: $letter-spacing-title;
    white-space: nowrap;
  }

  &__center {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    justify-content: center;
  }

  // 公告区：滚动条 + 右侧「知道🌶️」勾选，整体占据 header 中间
  &__notice {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    justify-content: center;
  }

  // 滚动公告条：CSS marquee 无依赖
  &__marquee {
    flex: 1;
    min-width: 0;          // flex 子项默认 min-width:auto 会被 nowrap 文字撑破 border
    overflow: hidden;
    display: flex;
    align-items: center;
    max-width: 560px;
    padding: 4px 12px;
    border: 1px solid var(--notice-border, rgba(255, 167, 38, 0.5));
    border-radius: $radius-full;
    background: var(--notice-bg, rgba(255, 167, 38, 0.1));
  }

  // 仅 hover 公告条本身才暂停滚动，不波及 header 其他空白区
  // （放外层：& = .app-header，避免嵌套内 & 拼成 __marquee__marquee-track）
  &__marquee:hover &__marquee-track {
    animation-play-state: paused;
  }

  &__marquee-track {
    flex: 0 0 auto;        // 不压缩：按内容自然宽，translateX(-50%) 才能基于真实内容宽平移
    width: max-content;
    display: inline-flex;
    white-space: nowrap;
    animation: marquee-scroll 22s linear infinite;
  }

  // 无障碍：系统级"减少动态效果"时停止滚动
  @media (prefers-reduced-motion: reduce) {
    &__marquee-track { animation: none; }
  }

  &__marquee-text {
    font-size: $font-size-sm;
    color: var(--notice-text, #f57c00);
    font-weight: $font-weight-semibold;
    padding-right: 64px;  // 两段之间的间隔
  }

  &__notice-dismiss {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    font-size: 11px;
    color: $text-secondary;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;

    input {
      margin: 0;
      cursor: pointer;
    }
  }

  // 浅色模式：橙字在白底上加深，背景更明显
  [data-theme="light"] &__marquee {
    --notice-border: rgba(245, 124, 0, 0.45);
    --notice-bg: rgba(255, 167, 38, 0.16);
    --notice-text: #e65100;
  }

  // Apple 风格：导航栏透明背景，pill 形状标签
  &__nav {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    background: transparent;
    border-radius: $radius-full;
    padding: $spacing-xs;
    border: none;
  }

  &__nav-tab {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-lg;
    border-radius: $radius-full;  // Pill 形状
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: $text-secondary;
    transition: background 0.15s ease, color 0.15s ease;
    text-decoration: none;
    white-space: nowrap;

    &:hover {
      background: var(--bg-glass-hover);
      color: $text-primary;
    }

    &--active {
      background: $primary-color;  // Action Blue
      color: $text-white;

      &:hover {
        background: $primary-light;
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

// Apple 风格：主题/GitHub 按钮，珍珠风格
  &__theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: $radius-md;      // 11px
    border: 1px solid var(--border-color);
    background: transparent;
    color: $text-secondary;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    flex-shrink: 0;

    &:hover {
      background: var(--bg-glass-hover);
      color: $text-primary;
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &__github-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: $radius-md;      // 11px
    border: 1px solid var(--border-color);
    background: transparent;
    color: $text-secondary;
    transition: background 0.15s ease, transform 0.15s ease;
    flex-shrink: 0;
    text-decoration: none;

    &:hover {
      background: var(--bg-glass-hover);
      color: $text-primary;
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

// Apple 风格：Header 按钮
.header-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-full;    // Pill 形状
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  border: none;
  font-family: $font-family;
  white-space: nowrap;

  &--ai-help {
    background: $primary-color;   // Action Blue（移除渐变）
    color: $text-white;

    &:hover {
      background: $primary-light;
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &--scan,
  &--template {
    background: transparent;
    color: $primary-color;
    border: 1px solid $primary-color;

    &:hover {
      background: rgba($primary-color, 0.06);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &--export {
    background: $primary-color;   // Action Blue
    color: $text-white;

    &:hover {
      background: $primary-light;
    }

    &:active {
      transform: scale(0.95);
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
</style>
