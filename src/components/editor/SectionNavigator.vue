<template>
  <div class="section-navigator" :class="{ 'section-navigator--collapsed': isCollapsed }">
    <!-- 中间区域：导航列表 + 主题色，流式排列，占满空间 -->
    <div class="navigator__middle" ref="navigatorListRef">
      <div class="navigator__list" role="tablist" aria-label="简历模块导航">
        <draggable
          v-model="sortableSections"
          item-key="id"
          handle=".nav-item__drag-handle"
          :animation="200"
          ghost-class="nav-item--ghost"
          chosen-class="nav-item--chosen"
          drag-class="nav-item--drag"
          :scroll="navigatorListRef"
          :scroll-sensitivity="80"
          :scroll-speed="10"
          @start="flipNav.recordPositions"
          @end="flipNav.animateFlip"
        >
          <template #item="{ element: item }">
            <div
              class="nav-item"
              :class="{
                'nav-item--active': activeSectionId === item.id,
                'nav-item--basic': item.id === 'basic',
                'nav-item--hidden': !item.visible
              }"
              role="tab"
              tabindex="0"
              :aria-selected="activeSectionId === item.id"
              :aria-label="item.label"
              :data-flip-id="item.id"
              @click="handleSelect(item.id)"
              @keydown.enter="handleSelect(item.id)"
              @keydown.space.prevent="handleSelect(item.id)"
              @mouseenter="showTooltip($event, item.label)"
              @mouseleave="hideTooltip"
            >
              <!-- 拖拽手柄 -->
              <span
                v-if="!isCollapsed && item.id !== 'basic'"
                class="nav-item__drag-handle"
              >
                <Icon :icon="DRAG_HANDLE_ICON" :width="20" :height="20" />
              </span>
              <span class="nav-item__icon">
                <Icon :icon="item.icon" :width="16" :height="16" />
              </span>
              <span v-if="!isCollapsed" class="nav-item__label">{{ item.label }}</span>
              <button
                v-if="!isCollapsed && item.id !== 'basic'"
                class="nav-item__hide"
                @click.stop="handleToggleVisible(item.id)"
              >
                <Icon :icon="item.visible ? EYE_ICON : EYE_OFF_ICON" :width="20" :height="20" />
              </button>
              <n-popconfirm v-if="!isCollapsed && item.id !== 'basic'" negative-text="取消" positive-text="删除" @positive-click="removeSection(item.id)">
                <template #trigger>
                  <button class="nav-item__remove" @click.stop>
                    <Icon :icon="TRASH_ICON" :width="20" :height="20" />
                  </button>
                </template>
                确定删除「{{ resumeStore.currentResume ? getSectionTitle(resumeStore.currentResume, item.id) : item.label }}」？删除后可在「回收箱」恢复或者通过「添加模块」重新添加空模块。
              </n-popconfirm>
            </div>
          </template>
        </draggable>
      </div>

      <!-- 主题色面板 -->
      <div v-if="!isCollapsed" class="theme-color-panel">
        <div class="theme-color-panel__header">
          <Icon icon="mdi:palette-outline" :width="16" />
          <span>主题色</span>
        </div>
        <div class="theme-color-panel__presets">
          <button
            v-for="(color, i) in THEME_PRESET_COLORS"
            :key="i"
            class="theme-swatch"
            :class="{ 'theme-swatch--active': isThemeSwatchActive(color) }"
            :style="{ background: color }"
            @click="selectThemeColor(color)"
          />
        </div>
        <div class="theme-color-panel__alpha-row">
          <span class="setting-label">透明度</span>
          <n-slider v-model:value="themeAlpha" :min="0" :max="100" :step="1" size="small" @update:value="onThemeAlphaChange" />
          <span class="setting-value">{{ themeAlpha }}%</span>
        </div>
        <n-color-picker
          :value="themeAccentHex"
          :show-alpha="false"
          :modes="['hex', 'rgb']"
          :swatches="THEME_EXTRA_COLORS"
          size="small"
          placement="right"
          @update:value="onThemeColorPickerChange"
        >
          <template #trigger="{ onClick }">
            <button class="theme-color-panel__more-btn" @click="onClick">
              <span class="theme-color-panel__more-swatch" :style="{ background: themeAccentHex }" />
              <span>更多颜色</span>
              <Icon icon="mdi:palette-outline" :width="14" />
            </button>
          </template>
        </n-color-picker>
      </div>

      <!-- 文字设置面板 -->
      <div v-if="!isCollapsed" class="font-settings-panel">
        <div class="font-settings-panel__header">
          <Icon icon="mdi:format-font" :width="16" />
          <span>文字设置</span>
        </div>
        <div class="font-settings-panel__row">
          <span class="setting-label">字体</span>
          <n-select
            :value="currentFontFamily"
            :options="fontFamilyOptions"
            size="tiny"
            @update:value="v => resumeStore.updateCurrentResume({ fontFamily: v })"
          />
        </div>
        <div class="font-settings-panel__row">
          <span class="setting-label">行高</span>
          <n-slider v-model:value="lineHeightValue" :min="1" :max="2" :step="0.1" size="small" @update:value="v => resumeStore.updateCurrentResume({ lineHeight: v })" />
          <n-select
            :value="currentLineHeight"
            :options="lineHeightSelectOptions"
            size="tiny"
            style="width: 64px; flex-shrink: 0;"
            @update:value="v => resumeStore.updateCurrentResume({ lineHeight: Number(v) })"
          />
        </div>
        <div class="font-settings-panel__row">
          <span class="setting-label">正文字号</span>
          <n-select
            :value="currentBodyFontSize"
            :options="fontSizeSelectOptions"
            size="tiny"
            @update:value="v => resumeStore.updateCurrentResume({ bodyFontSize: Number(v) })"
          />
        </div>
        <div class="font-settings-panel__row">
          <span class="setting-label">一级标题</span>
          <n-select
            :value="currentSectionTitleFontSize"
            :options="fontSizeSelectOptions"
            size="tiny"
            @update:value="v => resumeStore.updateCurrentResume({ sectionTitleFontSize: Number(v) })"
          />
        </div>
        <div class="font-settings-panel__row">
          <span class="setting-label">二级标题</span>
          <n-select
            :value="currentEntryTitleFontSize"
            :options="fontSizeSelectOptions"
            size="tiny"
            @update:value="v => resumeStore.updateCurrentResume({ entryTitleFontSize: Number(v) })"
          />
        </div>
      </div>

      <!-- 间距设置面板 -->
      <div v-if="!isCollapsed" class="spacing-settings-panel">
        <div class="spacing-settings-panel__header">
          <Icon icon="mdi:arrow-expand-vertical" :width="16" />
          <span>间距设置</span>
        </div>

        <!-- 页边距 -->
        <div class="spacing-settings-panel__item">
          <span class="setting-label">页边距</span>
          <div class="spacing-settings-panel__slider-row">
            <n-slider :value="currentPagePadding" :min="0" :max="100" :step="1" size="small" @update:value="v => resumeStore.updateCurrentResume({ pagePadding: v })" />
            <n-input-number :value="currentPagePadding" :min="0" :max="100" size="tiny" @update:value="v => { if (v !== null) resumeStore.updateCurrentResume({ pagePadding: v }) }" />
            <span class="setting-unit">px</span>
          </div>
        </div>

        <!-- 模块间距 -->
        <div class="spacing-settings-panel__item">
          <span class="setting-label">模块间距</span>
          <div class="spacing-settings-panel__slider-row">
            <n-slider :value="currentModuleSpacing" :min="0" :max="50" :step="1" size="small" @update:value="v => resumeStore.updateCurrentResume({ moduleSpacing: v })" />
            <n-input-number :value="currentModuleSpacing" :min="0" :max="50" size="tiny" @update:value="v => { if (v !== null) resumeStore.updateCurrentResume({ moduleSpacing: v }) }" />
            <span class="setting-unit">px</span>
          </div>
        </div>

        <!-- 段落间距 -->
        <div class="spacing-settings-panel__item">
          <span class="setting-label">段落间距</span>
          <div class="spacing-settings-panel__slider-row">
            <n-slider :value="currentParagraphSpacing" :min="0" :max="50" :step="1" size="small" @update:value="v => resumeStore.updateCurrentResume({ paragraphSpacing: v })" />
            <n-input-number :value="currentParagraphSpacing" :min="0" :max="50" size="tiny" @update:value="v => { if (v !== null) resumeStore.updateCurrentResume({ paragraphSpacing: v }) }" />
            <span class="setting-unit">px</span>
          </div>
        </div>
      </div>
    </div>

  <!-- 添加模块按钮（常驻） -->
  <button class="navigator__add" @click="showAddModal = true">
    <Icon :icon="PLUS_ICON" :width="14" :height="14" />
    <span v-if="!isCollapsed">添加模块</span>
  </button>

  <!-- 收缩/展开按钮 -->
  <button class="navigator__collapse" @click="toggleCollapse">
    <Icon :icon="isCollapsed ? COLLAPSE_RIGHT_ICON : COLLAPSE_LEFT_ICON" :width="14" :height="14" />
  </button>

  <!-- 气泡提示（Teleport 到 body，避免被父容器 overflow 裁剪） -->
  <Teleport to="body">
    <div v-if="tooltipVisible" class="nav-tooltip" :style="tooltipStyle">{{ tooltipText }}</div>
  </Teleport>

  <!-- 添加模块弹窗 -->
    <AddSectionModal
      :visible="showAddModal"
      :hidden-sections="hiddenSections"
      @close="showAddModal = false"
      @add="handleAddSection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NPopconfirm, NColorPicker, NSelect, NSlider, NInputNumber } from 'naive-ui'
import { useResumeStore } from '@/stores/resumeStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { useFlipAnimation } from '@/composables/useFlipAnimation'
import { SECTION_CONFIG, getSectionTitle, isCustomSection, DEFAULT_LINE_HEIGHT, DEFAULT_PAGE_PADDING, DEFAULT_MODULE_SPACING, DEFAULT_PARAGRAPH_SPACING } from '@/types/resume'
import { getTemplate } from '@/config/templates'
import { FONT_SIZE_OPTIONS, FONT_FAMILY_OPTIONS, DEFAULT_FONT_FAMILY } from '@/config/fonts'
import { getSectionIcon, PLUS_ICON, COLLAPSE_LEFT_ICON, COLLAPSE_RIGHT_ICON, TRASH_ICON, DRAG_HANDLE_ICON, EYE_ICON, EYE_OFF_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import draggable from 'vuedraggable'
import AddSectionModal from './AddSectionModal.vue'

const resumeStore = useResumeStore()
const layoutStore = useEditorLayoutStore()

// ---- 主题色功能 ----
const THEME_PRESET_COLORS = [
  '#7c5cfc', '#06b6d4', '#475569', '#f97316',
  '#059669', '#2563eb', '#3b82f6', '#db2777',
  '#dc2626', '#ca8a04', '#7c3aed', '#92400e',
]
// 更多颜色弹窗中的色板——排除与预设重复的颜色
const THEME_EXTRA_COLORS = [
  '#ef4444', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7',
  '#ec4899', '#f43f5e', '#8b5cf6', '#d946ef',
]

const themeAlpha = ref(100)

// 从 store 同步颜色状态
function parseColorToHex(color: string): string {
  if (!color) return '#4f6df5'
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
    if (rgbaMatch[4] !== undefined) {
      themeAlpha.value = Math.round(parseFloat(rgbaMatch[4]) * 100)
    } else {
      themeAlpha.value = 100
    }
    return `#${r}${g}${b}`
  }
  // 已经是 hex
  if (color.startsWith('#')) return color
  return '#4f6df5'
}

const themeAccentHex = computed(() => {
  return parseColorToHex(resumeStore.currentResume?.themeAccentColor || '')
})

const isThemeSwatchActive = (swatchHex: string): boolean => {
  return themeAccentHex.value.toLowerCase() === swatchHex.toLowerCase() && themeAlpha.value === 100
}

const selectThemeColor = (color: string) => {
  themeAlpha.value = 100
  resumeStore.updateCurrentResume({ themeAccentColor: color })
}

const onThemeAlphaChange = () => {
  const hex = themeAccentHex.value
  resumeStore.updateCurrentResume({ themeAccentColor: buildRgba(hex, themeAlpha.value) })
}

const onThemeColorPickerChange = (value: string) => {
  // NColorPicker with show-alpha=false always returns hex like "#7c5cfc"
  // Only update the hue/saturation, keep alpha controlled by the external slider
  resumeStore.updateCurrentResume({ themeAccentColor: buildRgba(value, themeAlpha.value) })
}

function buildRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const n = parseInt(clean, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${(alpha / 100).toFixed(2)})`
}

// Sync alpha from store — parseColorToHex has a side effect: it updates themeAlpha ref
watch(() => resumeStore.currentResume?.themeAccentColor, () => {
  parseColorToHex(resumeStore.currentResume?.themeAccentColor || '')
}, { immediate: true })

// ---- 文字设置功能 ----
const fontFamilyOptions = FONT_FAMILY_OPTIONS.map(f => ({ label: f.label, value: f.value }))
const fontSizeSelectOptions = FONT_SIZE_OPTIONS.map(s => ({ label: `${s}px`, value: s }))
const LINE_HEIGHT_OPTIONS = Array.from({ length: 11 }, (_, i) => +(1 + i * 0.1).toFixed(1))
const lineHeightSelectOptions = LINE_HEIGHT_OPTIONS.map(lh => ({ label: `${lh}`, value: lh }))

const currentFontFamily = computed(() =>
  resumeStore.currentResume?.fontFamily || DEFAULT_FONT_FAMILY
)
const currentBodyFontSize = computed(() => {
  const t = getTemplate(resumeStore.currentResume?.templateId || 'sidebar')
  const fd = t.style.fontDefaults || {}
  return resumeStore.currentResume?.bodyFontSize || fd.bodyFontSize || 14
})
const currentSectionTitleFontSize = computed(() => {
  const t = getTemplate(resumeStore.currentResume?.templateId || 'sidebar')
  const fd = t.style.fontDefaults || {}
  return resumeStore.currentResume?.sectionTitleFontSize || fd.sectionTitleFontSize || 16
})
const currentEntryTitleFontSize = computed(() => {
  const t = getTemplate(resumeStore.currentResume?.templateId || 'sidebar')
  const fd = t.style.fontDefaults || {}
  return resumeStore.currentResume?.entryTitleFontSize || fd.entryTitleFontSize || 14
})
const currentLineHeight = computed(() =>
  resumeStore.currentResume?.lineHeight || DEFAULT_LINE_HEIGHT
)
// NSlider v-model:value needs a number ref for line height
const lineHeightValue = computed({
  get: () => currentLineHeight.value,
  set: (v: number) => resumeStore.updateCurrentResume({ lineHeight: v }),
})

// ---- 间距设置功能 ----
const currentPagePadding = computed(() =>
  resumeStore.currentResume?.pagePadding ?? DEFAULT_PAGE_PADDING
)
const currentModuleSpacing = computed(() =>
  resumeStore.currentResume?.moduleSpacing ?? DEFAULT_MODULE_SPACING
)
const currentParagraphSpacing = computed(() =>
  resumeStore.currentResume?.paragraphSpacing ?? DEFAULT_PARAGRAPH_SPACING
)

const navigatorListRef = ref<HTMLElement>()

const flipNav = useFlipAnimation(() => navigatorListRef.value, '.nav-item')

const emit = defineEmits<{
  'click-section': [sectionId: string, itemId?: string]
}>()

// 可见模块列表（vuedraggable 双向绑定）
const sortableSections = computed({
  get: () => {
    const order = resumeStore.getSectionOrder()
    const hidden = resumeStore.currentResume?.hiddenSections || []
    const resume = resumeStore.currentResume
    return order.map(id => ({
      id,
      label: resume ? getSectionTitle(resume, id) : (SECTION_CONFIG[id]?.label || id),
      icon: getSectionIcon(id),
      visible: !hidden.includes(id)
    }))
  },
  set: (newList) => {
    const sorted = [...newList]
    const basicIndex = sorted.findIndex(item => item.id === 'basic')
    if (basicIndex > 0) {
      const [basic] = sorted.splice(basicIndex, 1)
      sorted.unshift(basic)
    }
    resumeStore.updateSectionOrder(sorted.map(item => item.id))
  }
})

// 隐藏的模块列表（用于添加模块弹窗）
const hiddenSections = computed(() => {
  const visibleIds = resumeStore.getSectionOrder()
  const result: string[] = []
  for (const id of Object.keys(SECTION_CONFIG)) {
    if (!visibleIds.includes(id) && id !== 'basic' && id !== 'customText' && id !== 'customCard') {
      result.push(id)
    }
  }
  result.push('customText', 'customCard')
  return result
})

const activeSectionId = computed(() => layoutStore.activeSectionId)
const isCollapsed = computed(() => layoutStore.navCollapsed)
const showAddModal = ref(false)

watch(hiddenSections, (val) => {
  if (val.length === 0) showAddModal.value = false
})

// 气泡提示
const tooltipVisible = ref(false)
const tooltipText = ref('')
const tooltipStyle = ref<Record<string, string>>({})

const showTooltip = (e: MouseEvent, label: string) => {
  if (!isCollapsed.value) return
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  tooltipText.value = label
  tooltipStyle.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.right + 8}px`,
    transform: 'translateY(-50%)',
  }
  tooltipVisible.value = true
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

watch(sortableSections, (sections) => {
  if (!sections.find(s => s.id === activeSectionId.value)) {
    layoutStore.setActiveSection(sections[0]?.id || 'basic')
  }
}, { immediate: true })

const handleSelect = (sectionId: string) => {
  layoutStore.setActiveSection(sectionId)
  layoutStore.expandEditor()
  emit('click-section', sectionId)
}

const toggleCollapse = () => {
  layoutStore.toggleNavCollapse()
}

const handleAddSection = (sectionId: string) => {
  let newSectionId = sectionId
  if (sectionId === 'customText') {
    newSectionId = resumeStore.addCustomTextSection()
  } else if (sectionId === 'customCard') {
    newSectionId = resumeStore.addCustomCardSection()
  } else {
    resumeStore.addSection(sectionId)
  }
  layoutStore.setActiveSection(newSectionId)
  layoutStore.expandEditor()
}

const handleToggleVisible = (sectionId: string) => {
  if (sectionId === 'basic') return
  const hidden = resumeStore.currentResume?.hiddenSections || []
  if (hidden.includes(sectionId)) {
    resumeStore.showSection(sectionId)
  } else {
    resumeStore.hideSection(sectionId)
  }
}

const removeSection = (sectionId: string) => {
  if (sectionId === 'basic') return
  // ponytail: section 删除时暂存到 deletedSections
  resumeStore.trashSection(sectionId)
  if (isCustomSection(sectionId)) {
    resumeStore.removeCustomSection(sectionId)
  }
  if (activeSectionId.value === sectionId) {
    layoutStore.setActiveSection(sortableSections.value[0]?.id || 'basic')
  }
}
</script>

<style lang="scss" scoped>
.section-navigator {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: $spacing-md;
  gap: $spacing-sm;
  position: relative;

  &--collapsed {
    padding: $spacing-sm;
    align-items: center;

    .nav-item {
      justify-content: center;
      padding: $spacing-sm;
    }

    .navigator__add {
      width: 36px;
      padding: $spacing-sm;
      justify-content: center;
    }
  }
}

.navigator__middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  min-height: 0;
  overflow-y: auto;
  @include scrollbar;
}

.navigator__list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  position: relative;

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-secondary;
  }

  &__label {
    flex: 1;
    font-size: $font-size-sm;
    font-weight: 500;
    color: $text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__drag-handle {
    flex-shrink: 0;
    display: flex;
    color: $text-light;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__hide {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    color: $text-light;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;

    &:hover {
      background: $bg-glass-hover;
      color: $primary-light;
    }
  }

  &__remove {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    color: $error-color;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;

    &:hover {
      background: rgba($error-color, 0.15);
    }
  }

  &:hover {
    background: $bg-glass-hover;

    .nav-item__icon,
    .nav-item__label {
      color: $text-primary;
    }

    .nav-item__hide,
    .nav-item__remove {
      opacity: 1;
    }
  }

  &--active {
    background: $primary-bg-active;
    color: $text-white;
    box-shadow: $shadow-primary;

    .nav-item__icon,
    .nav-item__label {
      color: $text-white;
    }

    .nav-item__drag-handle {
      color: rgba(255, 255, 255, 0.5);
    }

    .nav-item__remove {
      color: rgba(255, 255, 255, 0.7);

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        color: $error-color;
      }
    }

    &:hover {
      .nav-item__remove {
        color: $error-color;
      }
    }
  }

  &--chosen {
    box-shadow: $shadow-md;
    transform: scale(1.02);
    z-index: 10;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.2s ease;
  }

  &--drag {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5),
                0 0 20px rgba($primary-color, 0.3);
    transform: scale(1.05);
    z-index: 100;
    opacity: 0.95;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.15s ease;
  }

  &--ghost {
    opacity: 0.3;
    border: 1px dashed $primary-color;
    background: rgba($primary-color, 0.05);
  }

  &--basic {
    .nav-item__drag-handle {
      display: none;
    }
  }

  &--hidden {
    .nav-item__icon,
    .nav-item__label {
      opacity: 0.4;
      text-decoration: line-through;
    }
  }
}

.navigator__add {
  flex-shrink: 0;
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  width: 100%;
  padding: $spacing-sm $spacing-md;
  border: 1px dashed $border-glass;
  border-radius: $radius-lg;
  background: transparent;
  color: $text-light;
  cursor: pointer;
  transition: all 0.15s;
  font-size: $font-size-sm;
  font-family: $font-family;

  &:hover {
    border-color: $primary-color;
    color: $primary-light;
    background: rgba($primary-color, 0.1);
  }
}

.navigator__collapse {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: $spacing-sm;
  background: $bg-glass;
  border: none;
  border-radius: $radius-md;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.15s;
  font-family: $font-family;

  &:hover {
    background: $bg-glass-hover;
    color: $text-primary;
  }
}

// ---- 通用设置标签 ----
.setting-label {
  font-size: $font-size-xs;
  color: $text-secondary;
  flex-shrink: 0;
  min-width: 42px;
}

.setting-value {
  font-size: $font-size-xs;
  color: $text-secondary;
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.setting-unit {
  font-size: $font-size-xs;
  color: $text-light;
  flex-shrink: 0;
  width: 16px;
}

// ---- 主题色面板 ----
.theme-color-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: $bg-glass;
  border-radius: $radius-lg;
  border: 1px solid $border-glass;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
  }

  &__presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__alpha-row {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__more-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    padding: 5px 0;
    background: transparent;
    border: 1px dashed $border-glass;
    border-radius: $radius-md;
    color: $text-light;
    font-size: $font-size-xs;
    cursor: pointer;
    transition: all $transition-fast;
    font-family: $font-family;

    &:hover {
      border-color: $primary-color;
      color: $primary-light;
      background: rgba($primary-color, 0.08);
    }
  }

  &__more-swatch {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--border-hover);
    flex-shrink: 0;
  }
}

.theme-swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border-hover);
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    transform: scale(1.15);
  }

  &--active {
    border-color: $primary-light;
    box-shadow: 0 0 0 2px rgba($primary-color, 0.3);
  }
}

// ---- 文字设置面板 ----
.font-settings-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-sm;
  background: $bg-glass;
  border-radius: $radius-lg;
  border: 1px solid $border-glass;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }
}

// ---- 间距设置面板 ----
.spacing-settings-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-sm;
  background: $bg-glass;
  border-radius: $radius-lg;
  border: 1px solid $border-glass;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__slider-row {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .n-input-number {
      width: 86px;
      flex-shrink: 0;
    }
  }
}
</style>

<!-- 气泡提示样式（非 scoped，确保 Teleport 到 body 后样式生效） -->
<style lang="scss">
.nav-tooltip {
  position: fixed;
  padding: 4px 10px;
  background: var(--tooltip-bg);
  border: 1px solid var(--tooltip-border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10000;
  box-shadow: var(--tooltip-shadow);
  animation: tooltip-fade-in 0.15s ease;
}

@keyframes tooltip-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>