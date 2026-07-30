<template>
  <div class="pet-preview">
    <div v-if="failed" class="pet-preview__broken" title="lottie 文件无效">
      <Icon icon="mdi:image-broken-variant" :width="28" />
    </div>
    <div v-show="!failed" ref="containerRef" class="pet-preview__anim" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Icon } from '@iconify/vue'
import lottie from 'lottie-web'
import { getDesktopPetById, isLikelyLottie } from '@/config/desktopPets'

const props = defineProps<{ petId: string }>()

const containerRef = ref<HTMLElement | null>(null)
const failed = ref(false)
let anim: ReturnType<typeof lottie.loadAnimation> | null = null

const load = () => {
  if (!containerRef.value) return
  anim?.destroy()
  anim = null
  failed.value = false
  const data = getDesktopPetById(props.petId).lottie
  // ponytail: 畸形 lottie JSON 会让 loadAnimation 抛错，前置校验 + try/catch 降级显示占位，避免渲染中断
  if (!isLikelyLottie(data)) {
    failed.value = true
    return
  }
  try {
    anim = lottie.loadAnimation({
      container: containerRef.value,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: data,
    })
  } catch (e) {
    console.error('[PetPreview] lottie 加载失败:', e)
    failed.value = true
  }
}

onMounted(load)
watch(() => props.petId, load)
onBeforeUnmount(() => {
  anim?.destroy()
  anim = null
})
</script>

<style scoped>
.pet-preview {
  width: 64px;
  height: 64px;
  position: relative;
}
.pet-preview__anim {
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.pet-preview__broken {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light, #999);
  opacity: 0.6;
}
</style>
