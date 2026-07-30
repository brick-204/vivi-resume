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
import { getDesktopPetById } from '@/config/desktopPets'
import { usePetRenderer } from '@/composables/usePetRenderer'

const props = defineProps<{ petId: string }>()

const failed = ref(false)
const { containerRef, petData, isImg, imgSrc, mountLottie, destroyLottie } = usePetRenderer()

const load = () => {
  destroyLottie()
  failed.value = false
  petData.value = getDesktopPetById(props.petId)

  // img 类型直接渲染 <img>，无需挂载 lottie
  if (isImg.value) return

  // lottie 类型：等容器渲染后挂载
  requestAnimationFrame(() => {
    if (containerRef.value && !mountLottie(containerRef.value)) {
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
