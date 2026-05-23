<template>
  <div class="color-picker-trigger" ref="triggerRef">
    <button type="button" class="color-picker-trigger__btn" :class="{ 'is-active': isActive }" :title="title" @click.stop="togglePanel">
      <Icon :icon="icon" :width="18" />
      <span class="color-indicator" :style="{ background: displayColor }" />
    </button>
    <Teleport to="body">
      <div v-if="open" class="color-picker-overlay" @click="open = false" />
      <div v-if="open" class="color-picker" ref="mainPanelRef" :style="panelStyle" @click.stop>
        <!-- 预设色板 -->
        <div class="color-picker__presets">
          <button
            class="preset-swatch preset-swatch--clear"
            title="清除颜色"
            @click="clearColor"
          >
            <span class="clear-x">✕</span>
          </button>
          <button
            v-for="(color, i) in presetColors"
            :key="i"
            class="preset-swatch"
            :class="{ 'preset-swatch--active': isSwatchActive(color) }"
            :style="{ background: color }"
            :title="color"
            @click="selectColor(color)"
          />
        </div>

        <!-- 透明度 -->
        <div class="color-picker__alpha-row">
          <span class="alpha-label">透明度</span>
          <div class="alpha-slider-wrap" ref="alphaSliderRef" @mousedown="onAlphaStart" @touchstart.prevent="onAlphaTouchStart">
            <div class="alpha-rail" :style="{ background: alphaTrackBg }" />
            <div class="alpha-thumb" :style="{ left: alpha + '%' }" />
          </div>
          <span class="alpha-value">{{ alpha }}%</span>
        </div>

        <!-- 更多颜色 -->
        <button class="color-picker__more-btn" @click="showMore = !showMore">
          更多颜色
        </button>
      </div>

      <!-- 更多颜色面板 — 向右展开 -->
      <div v-if="open && showMore" class="color-picker-extended" :style="extendedStyle" @click.stop>
        <div class="color-picker__custom">
          <!-- 色盘 -->
          <div class="sv-panel-wrap">
            <canvas ref="svCanvasRef" class="sv-canvas" width="200" height="150" @mousedown="onSvStart" />
            <div class="sv-cursor" :style="svCursorStyle" />
          </div>

          <!-- 色相条 -->
          <div class="hue-row" ref="hueSliderRef" @mousedown="onHueStart" @touchstart.prevent="onHueTouchStart">
            <div class="hue-track" />
            <div class="hue-thumb" :style="{ left: (hue / 360 * 100) + '%' }" />
          </div>

          <!-- RGB + HEX -->
          <div class="input-row">
            <div class="input-group">
              <label>R</label>
              <input type="number" min="0" max="255" :value="r" @input="onRgbInput('r', $event)" />
            </div>
            <div class="input-group">
              <label>G</label>
              <input type="number" min="0" max="255" :value="g" @input="onRgbInput('g', $event)" />
            </div>
            <div class="input-group">
              <label>B</label>
              <input type="number" min="0" max="255" :value="b" @input="onRgbInput('b', $event)" />
            </div>
            <div class="input-group input-group--hex">
              <label>#</label>
              <input type="text" maxlength="6" :value="hexNoHash" @input="onHexInput" />
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(defineProps<{
  modelValue: string
  presetColors: string[]
  icon: string
  title: string
  isActive?: boolean
}>(), {
  isActive: false,
})

const emit = defineEmits<{
  'update:modelValue': [color: string]
  'clear': []
}>()

const open = ref(false)
const showMore = ref(false)
const triggerRef = ref<HTMLElement>()
const svCanvasRef = ref<HTMLCanvasElement>()
const alphaSliderRef = ref<HTMLElement>()
const hueSliderRef = ref<HTMLElement>()
const mainPanelRef = ref<HTMLElement>()

// HSV state
const hue = ref(0)
const sat = ref(100)
const val = ref(100)
const alpha = ref(100)
const r = ref(0)
const g = ref(0)
const b = ref(0)

const displayColor = computed(() => props.modelValue || 'transparent')

const isSwatchActive = (swatchHex: string): boolean => {
  const parsed = parseColor(props.modelValue)
  if (!parsed) return false
  const swatchRgb = hexToRgb(swatchHex)
  if (!swatchRgb) return false
  return parsed.r === swatchRgb[0] && parsed.g === swatchRgb[1] && parsed.b === swatchRgb[2] && parsed.a === 100
}

// ---- Color conversion helpers ----
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
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

function rgbToHsv(rr: number, gg: number, bb: number): [number, number, number] {
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

function rgbToHex(rr: number, gg: number, bb: number): string {
  return [rr, gg, bb].map(c => c.toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const n = parseInt(clean, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  if (!color) return null
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return { r: +rgbaMatch[1], g: +rgbaMatch[2], b: +rgbaMatch[3], a: rgbaMatch[4] !== undefined ? Math.round(+rgbaMatch[4] * 100) : 100 }
  }
  const hex = hexToRgb(color)
  if (hex) return { r: hex[0], g: hex[1], b: hex[2], a: 100 }
  return null
}

function buildRgba(): string {
  return `rgba(${r.value}, ${g.value}, ${b.value}, ${(alpha.value / 100).toFixed(2)})`
}

// ---- Sync modelValue → internal state ----
watch(() => props.modelValue, (newVal) => {
  const parsed = parseColor(newVal)
  if (!parsed) return
  r.value = parsed.r
  g.value = parsed.g
  b.value = parsed.b
  alpha.value = parsed.a
  const [h2, s2, v2] = rgbToHsv(parsed.r, parsed.g, parsed.b)
  hue.value = h2
  sat.value = s2
  val.value = v2
  if (showMore.value) drawSvCanvas()
}, { immediate: true })

// When panel opens, initialize internal state from modelValue
watch(open, (v) => {
  if (!v) return
  const parsed = parseColor(props.modelValue)
  if (parsed) {
    r.value = parsed.r; g.value = parsed.g; b.value = parsed.b
    alpha.value = parsed.a
    const [h2, s2, v2] = rgbToHsv(parsed.r, parsed.g, parsed.b)
    hue.value = h2; sat.value = s2; val.value = v2
  } else {
    r.value = 255; g.value = 255; b.value = 255; alpha.value = 100
    hue.value = 0; sat.value = 0; val.value = 100
  }
  showMore.value = false
  nextTick(() => { if (showMore.value) drawSvCanvas() })
})

// ---- Panel positioning ----
const panelStyle = computed(() => {
  if (!triggerRef.value) return { position: 'fixed' as const, top: '0px', left: '0px' }
  const rect = triggerRef.value.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
})

const extendedStyle = computed(() => {
  if (!triggerRef.value) return { position: 'fixed' as const, top: '0px', left: '0px' }
  const triggerRect = triggerRef.value.getBoundingClientRect()
  const mainTop = triggerRect.bottom + 4
  const mainLeft = triggerRect.left
  const mainWidth = mainPanelRef.value ? mainPanelRef.value.offsetWidth : 224
  return {
    position: 'fixed' as const,
    top: `${mainTop}px`,
    left: `${mainLeft + mainWidth + 4}px`,
  }
})

// ---- Actions ----
const togglePanel = () => {
  open.value = !open.value
}

const selectColor = (color: string) => {
  const parsed = parseColor(color)
  if (!parsed) return
  r.value = parsed.r; g.value = parsed.g; b.value = parsed.b
  alpha.value = 100
  const [h2, s2, v2] = rgbToHsv(parsed.r, parsed.g, parsed.b)
  hue.value = h2; sat.value = s2; val.value = v2
  emit('update:modelValue', buildRgba())
  open.value = false
}

const clearColor = () => {
  emit('clear')
  open.value = false
}

// ---- Alpha slider drag ----
let alphaDragging = false

const updateAlphaFromX = (clientX: number) => {
  const el = alphaSliderRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  alpha.value = Math.round(ratio * 100)
}

const onAlphaStart = (e: MouseEvent) => {
  e.preventDefault()
  alphaDragging = true
  updateAlphaFromX(e.clientX)
  const onMove = (ev: MouseEvent) => { if (alphaDragging) updateAlphaFromX(ev.clientX) }
  const onUp = () => {
    alphaDragging = false
    emit('update:modelValue', buildRgba())
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const onAlphaTouchStart = (e: TouchEvent) => {
  alphaDragging = true
  updateAlphaFromX(e.touches[0].clientX)
  const onMove = (ev: TouchEvent) => { if (alphaDragging) updateAlphaFromX(ev.touches[0].clientX) }
  const onUp = () => {
    alphaDragging = false
    emit('update:modelValue', buildRgba())
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onUp)
  }
  window.addEventListener('touchmove', onMove)
  window.addEventListener('touchend', onUp)
}

// ---- SV Canvas ----
const drawSvCanvas = () => {
  const canvas = svCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width, h = canvas.height
  const hueColor = hsvToRgb(hue.value, 100, 100)
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

const svCursorStyle = computed(() => ({
  left: `${sat.value}%`,
  top: `${100 - val.value}%`,
}))

let svDragging = false
const onSvStart = (e: MouseEvent) => {
  svDragging = true
  updateSvFromEvent(e)
  const onMove = (ev: MouseEvent) => { if (svDragging) updateSvFromEvent(ev) }
  const onUp = () => {
    svDragging = false
    emit('update:modelValue', buildRgba())
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const updateSvFromEvent = (e: MouseEvent) => {
  const canvas = svCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  let y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  sat.value = Math.round(x * 100)
  val.value = Math.round((1 - y) * 100)
  const rgb = hsvToRgb(hue.value, sat.value, val.value)
  r.value = rgb[0]; g.value = rgb[1]; b.value = rgb[2]
}

// ---- Hue slider drag ----
let hueDragging = false

const updateHueFromX = (clientX: number) => {
  const el = hueSliderRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  hue.value = Math.round(ratio * 360)
  const rgb = hsvToRgb(hue.value, sat.value, val.value)
  r.value = rgb[0]; g.value = rgb[1]; b.value = rgb[2]
}

const onHueStart = (e: MouseEvent) => {
  e.preventDefault()
  hueDragging = true
  updateHueFromX(e.clientX)
  const onMove = (ev: MouseEvent) => {
    if (!hueDragging) return
    updateHueFromX(ev.clientX)
    drawSvCanvas()
  }
  const onUp = () => {
    hueDragging = false
    emit('update:modelValue', buildRgba())
    drawSvCanvas()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const onHueTouchStart = (e: TouchEvent) => {
  hueDragging = true
  updateHueFromX(e.touches[0].clientX)
  const onMove = (ev: TouchEvent) => {
    if (!hueDragging) return
    updateHueFromX(ev.touches[0].clientX)
    drawSvCanvas()
  }
  const onUp = () => {
    hueDragging = false
    emit('update:modelValue', buildRgba())
    drawSvCanvas()
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onUp)
  }
  window.addEventListener('touchmove', onMove)
  window.addEventListener('touchend', onUp)
}

// ---- RGB / HEX inputs ----
const hexNoHash = computed(() => rgbToHex(r.value, g.value, b.value))

const onRgbInput = (channel: 'r' | 'g' | 'b', e: Event) => {
  let v = parseInt((e.target as HTMLInputElement).value) || 0
  v = Math.max(0, Math.min(255, v))
  if (channel === 'r') r.value = v
  else if (channel === 'g') g.value = v
  else b.value = v
  const [h2, s2, v2] = rgbToHsv(r.value, g.value, b.value)
  hue.value = h2; sat.value = s2; val.value = v2
  emit('update:modelValue', buildRgba())
  drawSvCanvas()
}

const onHexInput = (e: Event) => {
  const parsed = hexToRgb((e.target as HTMLInputElement).value)
  if (!parsed) return
  r.value = parsed[0]; g.value = parsed[1]; b.value = parsed[2]
  const [h2, s2, v2] = rgbToHsv(r.value, g.value, b.value)
  hue.value = h2; sat.value = s2; val.value = v2
  emit('update:modelValue', buildRgba())
  drawSvCanvas()
}

// ---- Alpha track background ----
const alphaTrackBg = computed(() => {
  const rgb = `${r.value},${g.value},${b.value}`
  return `linear-gradient(to right, rgba(${rgb},0), rgba(${rgb},1))`
})

// ---- Draw canvas when more panel opens ----
watch(showMore, (v) => { if (v) nextTick(drawSvCanvas) })

// ---- Close on Escape ----
const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape' && open.value) open.value = false }
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<style lang="scss" scoped>
.color-picker-trigger {
  position: relative;
}

.color-picker-trigger__btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-radius: $radius-md;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba($text-secondary, 0.15);
  }

  &.is-active {
    background: rgba($primary-color, 0.2);
    color: $primary-light;
  }
}

.color-indicator {
  position: absolute;
  bottom: 2px;
  left: 5px;
  right: 5px;
  height: 3px;
  border-radius: 2px;
}

.color-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.color-picker {
  z-index: 1000;
  width: 224px;
  background: $bg-primary;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.color-picker-extended {
  z-index: 1000;
  background: $bg-primary;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $spacing-md;
}

.color-picker__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-swatch {
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

  &--clear {
    background: $bg-primary;
    border: 2px dashed rgba(255, 255, 255, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;

    .clear-x {
      font-size: 11px;
      color: $text-light;
      line-height: 1;
    }
  }
}

.color-picker__alpha-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
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

.color-picker__more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 6px 0;
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

.color-picker__custom {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.sv-panel-wrap {
  position: relative;
  width: 200px;
  height: 150px;
  margin: 0 auto;
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