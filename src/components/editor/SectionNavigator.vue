<template>
  <div class="section-navigator" :class="{ 'section-navigator--collapsed': isCollapsed }">
    <!-- 导航项列表 -->
    <div class="navigator__list" ref="navigatorListRef">
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
            :data-flip-id="item.id"
            @click="handleSelect(item.id)"
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
            <button
              v-if="!isCollapsed && item.id !== 'basic'"
              class="nav-item__remove"
              @click.stop="confirmRemove(item.id)"
            >
              <Icon :icon="TRASH_ICON" :width="20" :height="20" />
            </button>
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
        <span class="alpha-label">透明度</span>
        <div class="alpha-slider-wrap" ref="themeAlphaSliderRef" @mousedown="onThemeAlphaStart" @touchstart.prevent="onThemeAlphaTouchStart">
          <div class="alpha-rail" :style="{ background: themeAlphaTrackBg }" />
          <div class="alpha-thumb" :style="{ left: themeAlpha + '%' }" />
        </div>
        <span class="alpha-value">{{ themeAlpha }}%</span>
      </div>
      <button class="theme-color-panel__more-btn" @click="themeShowMore = !themeShowMore">
        <Icon :icon="themeShowMore ? 'mdi:chevron-down' : 'mdi:chevron-up'" :width="14" />
        更多颜色
      </button>
      <div v-if="themeShowMore" class="theme-color-panel__extended">
        <div class="sv-panel-wrap">
          <canvas ref="themeSvCanvasRef" class="sv-canvas" width="200" height="150" @mousedown="onThemeSvStart" />
          <div class="sv-cursor" :style="themeSvCursorStyle" />
        </div>
        <div class="hue-row" ref="themeHueSliderRef" @mousedown="onThemeHueStart" @touchstart.prevent="onThemeHueTouchStart">
          <div class="hue-track" />
          <div class="hue-thumb" :style="{ left: (themeHue / 360 * 100) + '%' }" />
        </div>
        <div class="input-row">
          <div class="input-group">
            <label>R</label>
            <input type="number" min="0" max="255" :value="themeR" @input="onThemeRgbInput('r', $event)" />
          </div>
          <div class="input-group">
            <label>G</label>
            <input type="number" min="0" max="255" :value="themeG" @input="onThemeRgbInput('g', $event)" />
          </div>
          <div class="input-group">
            <label>B</label>
            <input type="number" min="0" max="255" :value="themeB" @input="onThemeRgbInput('b', $event)" />
          </div>
          <div class="input-group input-group--hex">
            <label>#</label>
            <input type="text" maxlength="6" :value="themeHexNoHash" @input="onThemeHexInput" />
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

    <!-- 添加模块弹窗 -->
    <AddSectionModal
      :visible="showAddModal"
      :hidden-sections="hiddenSections"
      @close="showAddModal = false"
      @add="handleAddSection"
    />

    <!-- 删除确认弹窗 -->
    <BaseModal
      v-if="removeConfirmId"
      :visible="true"
      title="删除模块"
      size="sm"
      @close="removeConfirmId = null"
    >
      <p class="confirm-text">确定要删除「{{ removeConfirmId && resumeStore.currentResume ? getSectionTitle(resumeStore.currentResume, removeConfirmId) : '' }}」模块吗？删除后可通过「添加模块」恢复。</p>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="removeConfirmId = null">取消</BaseButton>
        <BaseButton variant="danger" size="sm" @click="removeSection(removeConfirmId!)">删除</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { useFlipAnimation } from '@/composables/useFlipAnimation'
import { SECTION_CONFIG, getSectionTitle, isCustomSection } from '@/types/resume'
import { getSectionIcon, PLUS_ICON, COLLAPSE_LEFT_ICON, COLLAPSE_RIGHT_ICON, TRASH_ICON, DRAG_HANDLE_ICON, EYE_ICON, EYE_OFF_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import draggable from 'vuedraggable'
import AddSectionModal from './AddSectionModal.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const resumeStore = useResumeStore()
const layoutStore = useEditorLayoutStore()

// ---- 主题色功能 ----
const THEME_PRESET_COLORS = [
  '#7c5cfc', '#06b6d4', '#475569', '#f97316',
  '#059669', '#2563eb', '#3b82f6', '#db2777',
]

const themeAlphaSliderRef = ref<HTMLElement>()
const themeHueSliderRef = ref<HTMLElement>()
const themeSvCanvasRef = ref<HTMLCanvasElement>()
const themeShowMore = ref(false)
const themeHue = ref(0)
const themeSat = ref(100)
const themeVal = ref(100)
const themeAlpha = ref(100)
const themeR = ref(0)
const themeG = ref(0)
const themeB = ref(0)

function themeHsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100; v /= 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let rr = 0, gg = 0, bb = 0
  if (h < 60) { rr = c; gg = x }
  else if (h < 120) { rr = x; gg = c }
  else if (h < 180) { gg = c; bb = x }
  else if (h < 240) { gg = x; bb = c }
  else if (h < 300) { rr = x; bb = c }
  else { rr = c; bb = x }
  return [Math.round((rr + m) * 255), Math.round((gg + m) * 255), Math.round((bb + m) * 255)]
}

function themeRgbToHsv(rr: number, gg: number, bb: number): [number, number, number] {
  const r2 = rr / 255, g2 = gg / 255, b2 = bb / 255
  const max = Math.max(r2, g2, b2), min = Math.min(r2, g2, b2), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r2) h = 60 * (((g2 - b2) / d) % 6)
    else if (max === g2) h = 60 * ((b2 - r2) / d + 2)
    else h = 60 * ((r2 - g2) / d + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100
  return [Math.round(h), Math.round(s), Math.round(v)]
}

function themeHexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const n = parseInt(clean, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function themeRgbToHex(rr: number, gg: number, bb: number): string {
  return [rr, gg, bb].map(c => c.toString(16).padStart(2, '0')).join('')
}

function themeParseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  if (!color) return null
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return { r: +rgbaMatch[1], g: +rgbaMatch[2], b: +rgbaMatch[3], a: rgbaMatch[4] !== undefined ? Math.round(+rgbaMatch[4] * 100) : 100 }
  }
  const hex = themeHexToRgb(color)
  if (hex) return { r: hex[0], g: hex[1], b: hex[2], a: 100 }
  return null
}

function themeBuildRgba(): string {
  return `rgba(${themeR.value}, ${themeG.value}, ${themeB.value}, ${(themeAlpha.value / 100).toFixed(2)})`
}

function themeSyncFromStore() {
  const color = resumeStore.currentResume?.themeAccentColor
  const parsed = themeParseColor(color || '')
  if (parsed) {
    themeR.value = parsed.r; themeG.value = parsed.g; themeB.value = parsed.b; themeAlpha.value = parsed.a
    const [h, s, v] = themeRgbToHsv(parsed.r, parsed.g, parsed.b)
    themeHue.value = h; themeSat.value = s; themeVal.value = v
  } else {
    themeR.value = 124; themeG.value = 92; themeB.value = 252; themeAlpha.value = 100
    themeHue.value = 252; themeSat.value = 63; themeVal.value = 99
  }
}

function themeSave() {
  resumeStore.updateCurrentResume({ themeAccentColor: themeBuildRgba() })
}

const isThemeSwatchActive = (swatchHex: string): boolean => {
  const parsed = themeParseColor(resumeStore.currentResume?.themeAccentColor || '')
  if (!parsed) return false
  const swatchRgb = themeHexToRgb(swatchHex)
  if (!swatchRgb) return false
  return parsed.r === swatchRgb[0] && parsed.g === swatchRgb[1] && parsed.b === swatchRgb[2] && parsed.a === 100
}

const selectThemeColor = (color: string) => {
  const parsed = themeHexToRgb(color)
  if (!parsed) return
  themeR.value = parsed[0]; themeG.value = parsed[1]; themeB.value = parsed[2]
  themeAlpha.value = 100
  const [h, s, v] = themeRgbToHsv(parsed[0], parsed[1], parsed[2])
  themeHue.value = h; themeSat.value = s; themeVal.value = v
  themeSave()
}

// Alpha slider
const themeAlphaTrackBg = computed(() => {
  const rgb = `${themeR.value},${themeG.value},${themeB.value}`
  return `linear-gradient(to right, rgba(${rgb},0), rgba(${rgb},1))`
})

let themeAlphaDragging = false
const updateThemeAlphaFromX = (clientX: number) => {
  const el = themeAlphaSliderRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  themeAlpha.value = Math.round(ratio * 100)
}

const onThemeAlphaStart = (e: MouseEvent) => {
  e.preventDefault()
  themeAlphaDragging = true
  updateThemeAlphaFromX(e.clientX)
  const onMove = (ev: MouseEvent) => { if (themeAlphaDragging) updateThemeAlphaFromX(ev.clientX) }
  const onUp = () => {
    themeAlphaDragging = false
    themeSave()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const onThemeAlphaTouchStart = (e: TouchEvent) => {
  themeAlphaDragging = true
  updateThemeAlphaFromX(e.touches[0].clientX)
  const onMove = (ev: TouchEvent) => { if (themeAlphaDragging) updateThemeAlphaFromX(ev.touches[0].clientX) }
  const onUp = () => {
    themeAlphaDragging = false
    themeSave()
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onUp)
  }
  window.addEventListener('touchmove', onMove)
  window.addEventListener('touchend', onUp)
}

// SV Canvas
const drawThemeSvCanvas = () => {
  const canvas = themeSvCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width, h = canvas.height
  const hueColor = themeHsvToRgb(themeHue.value, 100, 100)
  ctx.fillStyle = `rgb(${hueColor[0]},${hueColor[1]},${hueColor[2]})`
  ctx.fillRect(0, 0, w, h)
  const whiteGrad = ctx.createLinearGradient(0, 0, w, 0)
  whiteGrad.addColorStop(0, 'rgba(255,255,255,1)')
  whiteGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = whiteGrad
  ctx.fillRect(0, 0, w, h)
  const blackGrad = ctx.createLinearGradient(0, 0, 0, h)
  blackGrad.addColorStop(0, 'rgba(0,0,0,0)')
  blackGrad.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = blackGrad
  ctx.fillRect(0, 0, w, h)
}

const themeSvCursorStyle = computed(() => ({
  left: `${themeSat.value}%`,
  top: `${100 - themeVal.value}%`,
}))

let themeSvDragging = false
const onThemeSvStart = (e: MouseEvent) => {
  themeSvDragging = true
  updateThemeSvFromEvent(e)
  const onMove = (ev: MouseEvent) => { if (themeSvDragging) updateThemeSvFromEvent(ev) }
  const onUp = () => {
    themeSvDragging = false
    themeSave()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const updateThemeSvFromEvent = (e: MouseEvent) => {
  const canvas = themeSvCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  themeSat.value = Math.round(x * 100)
  themeVal.value = Math.round((1 - y) * 100)
  const rgb = themeHsvToRgb(themeHue.value, themeSat.value, themeVal.value)
  themeR.value = rgb[0]; themeG.value = rgb[1]; themeB.value = rgb[2]
}

// Hue slider
let themeHueDragging = false
const updateThemeHueFromX = (clientX: number) => {
  const el = themeHueSliderRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  themeHue.value = Math.round(ratio * 360)
  const rgb = themeHsvToRgb(themeHue.value, themeSat.value, themeVal.value)
  themeR.value = rgb[0]; themeG.value = rgb[1]; themeB.value = rgb[2]
}

const onThemeHueStart = (e: MouseEvent) => {
  e.preventDefault()
  themeHueDragging = true
  updateThemeHueFromX(e.clientX)
  drawThemeSvCanvas()
  const onMove = (ev: MouseEvent) => {
    if (!themeHueDragging) return
    updateThemeHueFromX(ev.clientX)
    drawThemeSvCanvas()
  }
  const onUp = () => {
    themeHueDragging = false
    themeSave()
    drawThemeSvCanvas()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const onThemeHueTouchStart = (e: TouchEvent) => {
  themeHueDragging = true
  updateThemeHueFromX(e.touches[0].clientX)
  drawThemeSvCanvas()
  const onMove = (ev: TouchEvent) => {
    if (!themeHueDragging) return
    updateThemeHueFromX(ev.touches[0].clientX)
    drawThemeSvCanvas()
  }
  const onUp = () => {
    themeHueDragging = false
    themeSave()
    drawThemeSvCanvas()
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onUp)
  }
  window.addEventListener('touchmove', onMove)
  window.addEventListener('touchend', onUp)
}

// RGB / HEX inputs
const themeHexNoHash = computed(() => themeRgbToHex(themeR.value, themeG.value, themeB.value))

const onThemeRgbInput = (channel: 'r' | 'g' | 'b', e: Event) => {
  let v = parseInt((e.target as HTMLInputElement).value) || 0
  v = Math.max(0, Math.min(255, v))
  if (channel === 'r') themeR.value = v
  else if (channel === 'g') themeG.value = v
  else themeB.value = v
  const [h, s, val] = themeRgbToHsv(themeR.value, themeG.value, themeB.value)
  themeHue.value = h; themeSat.value = s; themeVal.value = val
  themeSave()
  drawThemeSvCanvas()
}

const onThemeHexInput = (e: Event) => {
  const parsed = themeHexToRgb((e.target as HTMLInputElement).value)
  if (!parsed) return
  themeR.value = parsed[0]; themeG.value = parsed[1]; themeB.value = parsed[2]
  const [h, s, v] = themeRgbToHsv(themeR.value, themeG.value, themeB.value)
  themeHue.value = h; themeSat.value = s; themeVal.value = v
  themeSave()
  drawThemeSvCanvas()
}

// Sync from store on mount and when accent color changes externally
watch(() => resumeStore.currentResume?.themeAccentColor, () => {
  themeSyncFromStore()
  if (themeShowMore.value) nextTick(drawThemeSvCanvas)
}, { immediate: true })

watch(themeShowMore, (v) => { if (v) nextTick(drawThemeSvCanvas) })

onBeforeUnmount(() => {
  // cleanup not needed since we use window listeners that self-remove on mouseup
})

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
    // 不允许 basic 被移到非首位
    const basicIndex = newList.findIndex(item => item.id === 'basic')
    if (basicIndex > 0) {
      const [basic] = newList.splice(basicIndex, 1)
      newList.unshift(basic)
    }
    resumeStore.updateSectionOrder(newList.map(item => item.id))
  }
})

// 隐藏的模块列表（用于添加模块弹窗）
const hiddenSections = computed(() => {
  const visibleIds = resumeStore.getSectionOrder()
  const result: string[] = []
  // 内置模块（排除自定义模块模板类型，它们单独处理）
  for (const id of Object.keys(SECTION_CONFIG)) {
    if (!visibleIds.includes(id) && id !== 'basic' && id !== 'customText' && id !== 'customCard') {
      result.push(id)
    }
  }
  // 自定义模块类型（始终可添加）
  result.push('customText', 'customCard')
  return result
})

// 当前选中模块
const activeSectionId = computed(() => layoutStore.activeSectionId)

// 收缩状态
const isCollapsed = computed(() => layoutStore.navCollapsed)

// 弹窗状态
const showAddModal = ref(false)

// 所有模块都添加完后自动关闭弹窗
watch(hiddenSections, (val) => {
  if (val.length === 0) showAddModal.value = false
})

// 删除确认状态
const removeConfirmId = ref<string | null>(null)

// 确保选中的模块始终可见
watch(sortableSections, (sections) => {
  if (!sections.find(s => s.id === activeSectionId.value)) {
    layoutStore.setActiveSection(sections[0]?.id || 'basic')
  }
}, { immediate: true })

// 选择模块
const handleSelect = (sectionId: string) => {
  layoutStore.setActiveSection(sectionId)
  // 如果编辑区收缩，自动展开
  layoutStore.expandEditor()
  emit('click-section', sectionId)
}

// 切换收缩状态
const toggleCollapse = () => {
  layoutStore.toggleNavCollapse()
}

// 添加模块
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

// 确认删除
const confirmRemove = (sectionId: string) => {
  if (sectionId === 'basic') return
  removeConfirmId.value = sectionId
}

// 切换模块可见性
const handleToggleVisible = (sectionId: string) => {
  if (sectionId === 'basic') return
  const hidden = resumeStore.currentResume?.hiddenSections || []
  if (hidden.includes(sectionId)) {
    resumeStore.showSection(sectionId)
  } else {
    resumeStore.hideSection(sectionId)
  }
}

// 删除模块
const removeSection = (sectionId: string) => {
  if (sectionId === 'basic') return
  if (isCustomSection(sectionId)) {
    resumeStore.removeCustomSection(sectionId)
  } else {
    resumeStore.removeSection(sectionId)
  }
  removeConfirmId.value = null
  // 如果删除的是当前选中的，切换到第一个
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

.navigator__list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  overflow-y: auto;
  @include scrollbar;
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
    background: $bg-glass;

    .nav-item__hide,
    .nav-item__remove {
      opacity: 1;
    }
  }

  &--active {
    background: $primary-gradient;
    color: $text-white;
    box-shadow: $shadow-primary;

    .nav-item__icon,
    .nav-item__label {
      color: $text-white;
    }

    .nav-item__drag-handle {
      color: rgba(255, 255, 255, 0.6);
    }

    .nav-item__remove {
      color: rgba(255, 255, 255, 0.7);

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ff6b6b;
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

.confirm-text {
  color: $text-secondary;
  font-size: $font-size-sm;
  line-height: 1.6;
  margin: 0;
}

// ---- 主题色面板 ----
.theme-color-panel {
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

  &__extended {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.theme-swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
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

.alpha-label {
  font-size: $font-size-xs;
  color: $text-secondary;
  flex-shrink: 0;
}

.alpha-slider-wrap {
  flex: 1;
  position: relative;
  height: 16px;
  border-radius: 8px;
  background: repeating-conic-gradient(#808080 0% 25%, #fff 0% 50%) 0 0 / 8px 8px;
  cursor: pointer;
}

.alpha-rail {
  position: absolute;
  inset: 0;
  border-radius: 8px;
}

.alpha-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(0, 0, 0, 0.25);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.alpha-value {
  font-size: $font-size-xs;
  color: $text-secondary;
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.sv-panel-wrap {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: $radius-sm;
  overflow: hidden;
  cursor: crosshair;
}

.sv-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.sv-cursor {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.hue-row {
  position: relative;
  height: 16px;
  border-radius: 8px;
  cursor: pointer;
}

.hue-track {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
}

.hue-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(0, 0, 0, 0.25);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.input-row {
  display: flex;
  gap: 6px;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;

  label {
    font-size: 10px;
    color: $text-light;
    text-align: center;
  }

  input {
    width: 100%;
    padding: 3px 4px;
    background: $bg-glass;
    border: 1px solid $border-glass;
    border-radius: $radius-sm;
    color: $text-primary;
    font-size: $font-size-xs;
    text-align: center;
    font-family: $font-family;
    outline: none;

    &:focus {
      border-color: $primary-color;
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
    }
  }

  &--hex {
    flex: 1.4;
  }
}
</style>
