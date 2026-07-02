<template>
  <n-modal
    :show="visible"
    preset="card"
    title="编辑头像"
    :style="{ maxWidth: '720px', width: 'auto' }"
    :mask-closable="false"
    @update:show="v => !v && $emit('close')"
  >
    <div class="photo-editor">
      <div
        ref="canvasAreaRef"
        class="photo-editor__canvas-area"
        :class="{
          'photo-editor__canvas-area--dragging': isDragging
        }"
      >
        <canvas ref="canvasRef" :width="canvasW" :height="canvasH" class="photo-editor__canvas" />
        <div class="photo-editor__overlay">
          <svg :viewBox="`0 0 ${canvasW} ${canvasH}`" class="photo-editor__svg">
            <defs>
              <mask :id="maskId">
                <rect width="100%" height="100%" fill="white" />
                <circle v-if="shape === 'circle'" :cx="frameCX" :cy="frameCY" :r="frameW / 2" fill="black" />
                <rect v-else :x="frameCX - frameW / 2" :y="frameCY - frameH / 2" :width="frameW" :height="frameH" fill="black" />
              </mask>
              <clipPath :id="clipId">
                <circle v-if="shape === 'circle'" :cx="frameCX" :cy="frameCY" :r="frameW / 2" />
                <rect v-else :x="frameCX - frameW / 2" :y="frameCY - frameH / 2" :width="frameW" :height="frameH" />
              </clipPath>
            </defs>

            <!-- Dark overlay outside frame -->
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" :mask="`url(#${maskId})`" />

            <!-- Frame border -->
            <circle v-if="shape === 'circle'" :cx="frameCX" :cy="frameCY" :r="frameW / 2" fill="none" stroke="white" stroke-width="2" stroke-dasharray="8 5" />
            <rect v-else :x="frameCX - frameW / 2" :y="frameCY - frameH / 2" :width="frameW" :height="frameH" fill="none" stroke="white" stroke-width="2" stroke-dasharray="8 5" />

            <!-- Dimension labels -->
            <template v-if="shape === 'circle'">
              <line :x1="frameCX + frameW / 2 + 12" :y1="frameCY - frameW / 2" :x2="frameCX + frameW / 2 + 12" :y2="frameCY + frameW / 2" stroke="white" stroke-width="0.8" opacity="0.6" />
              <line :x1="frameCX + frameW / 2 + 8" :y1="frameCY - frameW / 2" :x2="frameCX + frameW / 2 + 16" :y2="frameCY - frameW / 2" stroke="white" stroke-width="0.8" opacity="0.6" />
              <line :x1="frameCX + frameW / 2 + 8" :y1="frameCY + frameW / 2" :x2="frameCX + frameW / 2 + 16" :y2="frameCY + frameW / 2" stroke="white" stroke-width="0.8" opacity="0.6" />
              <text :x="frameCX + frameW / 2 + 14" :y="frameCY + 4" text-anchor="middle" fill="white" font-size="11" font-family="system-ui, sans-serif" opacity="0.8" paint-order="stroke" stroke="rgba(0,0,0,0.4)" stroke-width="2">⌀{{ dimW }}</text>
            </template>
            <template v-else>
              <g :clip-path="`url(#${clipId})`">
                <line :x1="frameCX - frameW / 2 + 6" :y1="frameCY + frameH / 2 - 14" :x2="frameCX + frameW / 2 - 6" :y2="frameCY + frameH / 2 - 14" stroke="white" stroke-width="0.8" opacity="0.6" />
                <line :x1="frameCX - frameW / 2 + 6" :y1="frameCY + frameH / 2 - 18" :x2="frameCX - frameW / 2 + 6" :y2="frameCY + frameH / 2 - 10" stroke="white" stroke-width="0.8" opacity="0.6" />
                <line :x1="frameCX + frameW / 2 - 6" :y1="frameCY + frameH / 2 - 18" :x2="frameCX + frameW / 2 - 6" :y2="frameCY + frameH / 2 - 10" stroke="white" stroke-width="0.8" opacity="0.6" />
                <text :x="frameCX" :y="frameCY + frameH / 2 - 16" text-anchor="middle" fill="white" font-size="11" font-family="system-ui, sans-serif" opacity="0.8" paint-order="stroke" stroke="rgba(0,0,0,0.4)" stroke-width="2">{{ dimW }}</text>

                <line :x1="frameCX + frameW / 2 - 14" :y1="frameCY - frameH / 2 + 6" :x2="frameCX + frameW / 2 - 14" :y2="frameCY + frameH / 2 - 6" stroke="white" stroke-width="0.8" opacity="0.6" />
                <line :x1="frameCX + frameW / 2 - 18" :y1="frameCY - frameH / 2 + 6" :x2="frameCX + frameW / 2 - 10" :y2="frameCY - frameH / 2 + 6" stroke="white" stroke-width="0.8" opacity="0.6" />
                <line :x1="frameCX + frameW / 2 - 18" :y1="frameCY + frameH / 2 - 6" :x2="frameCX + frameW / 2 - 10" :y2="frameCY + frameH / 2 - 6" stroke="white" stroke-width="0.8" opacity="0.6" />
                <text :x="frameCX + frameW / 2 - 14" :y="frameCY + 4" text-anchor="middle" fill="white" font-size="11" font-family="system-ui, sans-serif" opacity="0.8" paint-order="stroke" stroke="rgba(0,0,0,0.4)" stroke-width="2">{{ dimH }}</text>
              </g>
            </template>

            <!-- Person silhouette guide -->
            <g :clip-path="`url(#${clipId})`">
              <circle :cx="frameCX" :cy="frameCY - frameH * 0.2" :r="frameH * 0.11" fill="none" stroke="white" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.55" />
              <line :x1="frameCX" :y1="frameCY - frameH * 0.09" :x2="frameCX" :y2="frameCY + frameH * 0.01" stroke="white" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.45" />
              <path :d="shouldersPath" fill="none" stroke="white" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.45" />
              <line :x1="frameCX - frameW * 0.28" :y1="frameCY + frameH * 0.05" :x2="frameCX - frameW * 0.26" :y2="frameCY + frameH * 0.4" stroke="white" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.45" />
              <line :x1="frameCX + frameW * 0.28" :y1="frameCY + frameH * 0.05" :x2="frameCX + frameW * 0.26" :y2="frameCY + frameH * 0.4" stroke="white" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.45" />
              <line :x1="frameCX - frameW * 0.26" :y1="frameCY + frameH * 0.4" :x2="frameCX + frameW * 0.26" :y2="frameCY + frameH * 0.4" stroke="white" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.45" />
            </g>
          </svg>
        </div>
      </div>

      <div class="photo-editor__controls">
        <div class="photo-editor__group">
          <span class="photo-editor__label">缩放</span>
          <div class="photo-editor__slider-row">
            <n-button size="tiny" quaternary title="缩小" @click="zoomOut"><Icon icon="mdi:magnify-minus" :width="18" /></n-button>
            <n-slider v-model:value="zoom" :min="minZoom" :max="3" :step="0.01" size="small" />
            <n-button size="tiny" quaternary title="放大" @click="zoomIn"><Icon icon="mdi:magnify-plus" :width="18" /></n-button>
          </div>
        </div>

        <div class="photo-editor__group">
          <span class="photo-editor__label">旋转</span>
          <div class="photo-editor__btns">
            <n-button size="small" quaternary title="左旋转90°" @click="rotateLeft"><Icon icon="mdi:rotate-left" :width="18" /></n-button>
            <n-button size="small" quaternary title="右旋转90°" @click="rotateRight"><Icon icon="mdi:rotate-right" :width="18" /></n-button>
            <n-button size="small" quaternary title="重置" @click="resetAll"><Icon icon="mdi:undo" :width="18" /></n-button>
          </div>
        </div>

        <div class="photo-editor__group">
          <span class="photo-editor__label">形状</span>
          <div class="photo-editor__btns">
            <n-button size="small" :type="shape === 'circle' ? 'primary' : 'default'" @click="shape = 'circle'">
              <Icon icon="mdi:circle-outline" :width="18" /> 圆形
            </n-button>
            <n-button size="small" :type="shape === 'rectangle' ? 'primary' : 'default'" @click="shape = 'rectangle'">
              <Icon icon="mdi:rectangle-outline" :width="18" :style="{ transform: 'rotate(90deg)' }" /> 4:3
            </n-button>
          </div>
        </div>

        <div class="photo-editor__hint">
          <Icon icon="mdi:gesture-swipe" :width="16" />
          <span>拖动图片对齐人形框</span>
        </div>
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button size="small" @click="$emit('close')">取消</n-button>
        <n-button type="primary" size="small" @click="handleConfirm">确认</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, useId } from 'vue'
import { NModal, NButton, NSlider, NSpace } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useWorkerImageProcessor } from '@/composables/useWorkerImageProcessor'

const props = defineProps<{
  visible: boolean
  imageSrc: string
  currentShape?: 'circle' | 'rectangle'
}>()

const emit = defineEmits<{
  close: []
  confirm: [result: { photo: string; photoShape: 'circle' | 'rectangle' }]
}>()

const uid = useId()
const maskId = `frameMask_${uid}`
const clipId = `frameClip_${uid}`

const OUT_CIRCLE = 400
const OUT_RECT_W = 300
const OUT_RECT_H = 400  // 输出保持 300×400 高清，预览缩放显示为 80×107
const SCALE = 0.7
const PAD = 40

const shape = ref<'circle' | 'rectangle'>(props.currentShape || 'circle')

const frameW = computed(() =>
  shape.value === 'circle' ? OUT_CIRCLE * SCALE : OUT_RECT_W * SCALE
)
const frameH = computed(() =>
  shape.value === 'circle' ? OUT_CIRCLE * SCALE : OUT_RECT_H * SCALE
)

const canvasW = computed(() => frameW.value + PAD * 2)
const canvasH = computed(() => frameH.value + PAD * 2)
const frameCX = computed(() => canvasW.value / 2)
const frameCY = computed(() => canvasH.value / 2)

const dimW = computed(() => shape.value === 'circle' ? `${OUT_CIRCLE}` : `${OUT_RECT_W}`)
const dimH = computed(() => shape.value === 'circle' ? `${OUT_CIRCLE}` : `${OUT_RECT_H}`)

const shouldersPath = computed(() => {
  const cx = frameCX.value
  const cy = frameCY.value
  const fw = frameW.value
  const fh = frameH.value
  return `M${cx - fw * 0.28},${cy + fh * 0.05} Q${cx - fw * 0.15},${cy - fh * 0.04} ${cx},${cy - fh * 0.09} Q${cx + fw * 0.15},${cy - fh * 0.04} ${cx + fw * 0.28},${cy + fh * 0.05}`
})

const canvasRef = ref<HTMLCanvasElement>()
const canvasAreaRef = ref<HTMLDivElement>()
const zoom = ref(1)
const minZoom = 0.3
const rotation = ref(0)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)

let img: HTMLImageElement | null = null
let fetchAbort: AbortController | null = null
let dragStartX = 0
let dragStartY = 0
let panStartX = 0
let panStartY = 0
let boundEl: HTMLElement | null = null

const removeListeners = () => {
  if (boundEl) {
    boundEl.removeEventListener('pointerdown', onPointerDown)
    boundEl.removeEventListener('pointermove', onPointerMove)
    boundEl.removeEventListener('pointerup', onPointerUp)
    boundEl.removeEventListener('pointercancel', onPointerUp)
    boundEl = null
  }
}

const loadImage = () => {
  if (!props.imageSrc) return
  fetchAbort?.abort()
  fetchAbort = null
  if (props.imageSrc.startsWith('data:') || props.imageSrc.startsWith('blob:')) {
    img = new Image()
    img.onload = () => render()
    img.src = props.imageSrc
    return
  }
  const ac = new AbortController()
  fetchAbort = ac
  fetch(props.imageSrc, { mode: 'cors', signal: ac.signal })
    .then(r => r.blob())
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    }))
    .then(dataUrl => {
      if (ac.signal.aborted) return
      img = new Image()
      img.onload = () => render()
      img.src = dataUrl
    })
    .catch((_err) => {
      if (ac.signal.aborted) return
      img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => render()
      img.onerror = () => { img = null }
      img.src = props.imageSrc
    })
}

const render = () => {
  const canvas = canvasRef.value
  if (!canvas || !img) return
  const ctx = canvas.getContext('2d')!
  const cw = canvasW.value
  const ch = canvasH.value
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cw, ch)

  ctx.save()
  ctx.translate(frameCX.value + panX.value, frameCY.value + panY.value)
  ctx.rotate((rotation.value * Math.PI) / 180)
  ctx.scale(zoom.value, zoom.value)

  const scale = Math.max(frameW.value / img.width, frameH.value / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

const onPointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  panStartX = panX.value
  panStartY = panY.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

const onPointerMove = (e: PointerEvent) => {
  if (!isDragging.value) return
  panX.value = panStartX + (e.clientX - dragStartX)
  panY.value = panStartY + (e.clientY - dragStartY)
  render()
}

const onPointerUp = () => {
  isDragging.value = false
}

const zoomIn = () => { zoom.value = Math.min(zoom.value + 0.1, 3); render() }
const zoomOut = () => { zoom.value = Math.max(zoom.value - 0.1, minZoom); render() }
const rotateLeft = () => { rotation.value = (rotation.value - 90 + 360) % 360; render() }
const rotateRight = () => { rotation.value = (rotation.value + 90) % 360; render() }
const resetAll = () => { rotation.value = 0; zoom.value = 1; panX.value = 0; panY.value = 0; render() }

const { encodeImage } = useWorkerImageProcessor()

const handleConfirm = async () => {
  const outW = shape.value === 'circle' ? OUT_CIRCLE : OUT_RECT_W
  const outH = shape.value === 'circle' ? OUT_CIRCLE : OUT_RECT_H
  const offscreen = document.createElement('canvas')
  offscreen.width = outW
  offscreen.height = outH
  const ctx = offscreen.getContext('2d')!

  ctx.beginPath()
  if (shape.value === 'circle') {
    ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2)
  } else {
    ctx.rect(0, 0, outW, outH)
  }
  ctx.clip()

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outW, outH)

  if (img) {
    const scaleX = outW / frameW.value
    const scaleY = outH / frameH.value
    ctx.translate(outW / 2, outH / 2)
    ctx.rotate((rotation.value * Math.PI) / 180)
    ctx.scale(zoom.value, zoom.value)
    ctx.scale(scaleX, scaleY)
    ctx.translate(panX.value, panY.value)

    const scale = Math.max(frameW.value / img.width, frameH.value / img.height)
    const drawW = img.width * scale
    const drawH = img.height * scale
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  }

  const mimeType = shape.value === 'circle' ? 'image/png' : 'image/jpeg'
  const quality = shape.value === 'circle' ? undefined : 0.85

  try {
    const photo = await encodeImage(offscreen, mimeType, quality)
    emit('confirm', { photo, photoShape: shape.value })
  } catch (err) {
    console.error('[PhotoEditor] 图片编码失败:', err)
    emit('confirm', {
      photo: offscreen.toDataURL(mimeType, quality),
      photoShape: shape.value,
    })
  }
}

watch(canvasAreaRef, (el) => {
  removeListeners()
  if (el) {
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    boundEl = el
  }
})

onBeforeUnmount(() => {
  fetchAbort?.abort()
  removeListeners()
})

watch(() => [zoom.value, rotation.value, shape.value], () => nextTick(() => render()))
watch(() => props.visible, (v) => {
  if (v) {
    shape.value = props.currentShape || 'circle'
    zoom.value = 1
    rotation.value = 0
    panX.value = 0
    panY.value = 0
    nextTick(() => {
      requestAnimationFrame(() => loadImage())
    })
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.photo-editor {
  display: flex;
  gap: $spacing-lg;

  &__canvas-area {
    position: relative;
    flex-shrink: 0;
    background: #f3f4f6;
    border-radius: $radius-lg;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    width: fit-content;

    &--dragging {
      cursor: grabbing;
    }
  }

  &__canvas {
    display: block;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__svg {
    width: 100%;
    height: 100%;
  }

  &__controls {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &__label {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__btns {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    flex-wrap: wrap;
  }

  &__slider-row {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }

  &__hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
    color: $text-light;
    font-size: $font-size-xs;
  }
}
</style>