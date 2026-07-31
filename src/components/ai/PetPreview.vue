<template>
  <div class="pet-preview">
    <div v-if="failed" class="pet-preview__broken" title="lottie 文件无效">
      <Icon icon="mdi:image-broken-variant" :width="28" />
    </div>
    <img v-else-if="isImg" :src="imgSrc" class="pet-preview__img" alt="" />
    <div v-else ref="containerRef" v-show="!failed" class="pet-preview__anim" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getDesktopPetById, type DesktopPetConfig } from '@/config/desktopPets'
import { usePetRenderer } from '@/composables/usePetRenderer'

const props = defineProps<{
  petId: string
  /** 直接传入桌宠数据（回收站中的桌宠已不在缓存，需直传）；缺省则按 petId 查缓存 */
  pet?: DesktopPetConfig
}>()

const failed = ref(false)
const { containerRef, petData, isImg, imgSrc, mountLottie, destroyLottie } = usePetRenderer()

const load = () => {
  destroyLottie()
  failed.value = false
  // ponytail: 优先用直传数据（回收站桌宠已移出缓存），否则按 id 查内置+缓存
  petData.value = props.pet ?? getDesktopPetById(props.petId)

  // img 类型直接渲染 <img>，无需挂载 lottie
  if (isImg.value) return

  // lottie 类型：等容器渲染后挂载（静态预览，只渲染首帧，避免列表 N 个动画同跑卡顿）
  requestAnimationFrame(() => {
    if (containerRef.value && !mountLottie(containerRef.value, { autoplay: false })) {
      failed.value = true
    }
  })
}

onMounted(load)
watch(() => props.petId, load)
</script>

<style scoped>
.pet-preview {
  width: 64px;
  height: 64px;
  position: relative;
}
.pet-preview__anim,
.pet-preview__img {
  width: 100%;
  height: 100%;
  pointer-events: none;
  object-fit: contain;
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
