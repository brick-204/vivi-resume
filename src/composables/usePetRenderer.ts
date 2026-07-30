/**
 * 桌宠渲染分发
 *
 * 按 pet 的 type 字段决定渲染方式：
 * - img   → 返回 src，调用方用 <img> 渲染
 * - lottie（或缺省）→ 调用方提供容器 div，调 mountLottie(container) 用 lottie-web 加载
 *
 * PetPreview 和 DesktopPet 共享此逻辑，避免两处重复分发。
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import lottie from 'lottie-web'
import { getDesktopPetById, DEFAULT_PET_ID, isLikelyLottie } from '@/config/desktopPets'

export function usePetRenderer() {
  const containerRef = ref<HTMLElement | null>(null)
  let anim: ReturnType<typeof lottie.loadAnimation> | null = null

  /** 当前 pet 数据（由调用方在切换时更新，供 computed 读取 type/src） */
  const petData = ref(getDesktopPetById(DEFAULT_PET_ID))

  const isImg = computed(() => petData.value.type === 'img' && !!petData.value.src)
  const imgSrc = computed(() => (isImg.value ? petData.value.src! : ''))
  const lottieData = computed(() => petData.value.lottie)

  /**
   * 挂载 lottie 动画到 container。
   * 调用方：img 类型直接渲染 <img> 不调此方法；lottie 类型在容器 ready 后调用。
   * 数据畸形（非 lottie）返回 false，调用方自行回退。
   */
  const mountLottie = (container: HTMLElement): boolean => {
    let data = petData.value.lottie
    if (!isLikelyLottie(data)) return false
    try {
      anim = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: data,
      })
      return true
    } catch (e) {
      console.error('[usePetRenderer] lottie 加载失败:', e)
      return false
    }
  }

  const pauseLottie = () => anim?.pause()
  const playLottie = () => anim?.play()
  const destroyLottie = () => {
    anim?.destroy()
    anim = null
  }

  onBeforeUnmount(destroyLottie)

  return {
    containerRef,
    petData,
    isImg,
    imgSrc,
    lottieData,
    mountLottie,
    pauseLottie,
    playLottie,
    destroyLottie,
  }
}
