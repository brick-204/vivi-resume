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

  type PetAction = 'idle' | 'hover' | 'click' | 'happy' | 'thinking' | 'walk-left' | 'walk-right' | 'sleep'
  type ResolvedAction = { action: string; data: Record<string, unknown>; loop: boolean }
  const LOOP_ACTIONS = new Set<PetAction>(['idle', 'hover', 'thinking', 'walk-left', 'walk-right', 'sleep'])
  let activeContainer: HTMLElement | null = null
  let mountedAction: string | null = null
  let actionToken = 0
  const baseAction = ref<string>('idle')
  let temporaryAction: string | null = null

  const resolveAction = (requestedAction: string): ResolvedAction | null => {
    const animations = petData.value.lottieAnimations
    if (animations && Object.keys(animations).length > 0) {
      const selectedAction = [
        requestedAction,
        petData.value.initialAnimation,
        'idle',
        Object.keys(animations)[0],
      ].find(action => typeof action === 'string' && isLikelyLottie(animations[action]))
      if (selectedAction) {
        return {
          action: selectedAction,
          data: animations[selectedAction] as Record<string, unknown>,
          loop: selectedAction !== requestedAction || LOOP_ACTIONS.has(selectedAction as PetAction),
        }
      }
    }
    return isLikelyLottie(petData.value.lottie)
      ? { action: 'default', data: petData.value.lottie, loop: true }
      : null
  }

  const setBaseAction = (action: string): boolean => {
    baseAction.value = action
    return temporaryAction ? true : playPetAction(action)
  }
  const playTemporaryAction = (action: string): boolean => {
    const resolved = resolveAction(action)
    if (!resolved || resolved.loop) return false
    temporaryAction = action
    return playPetAction(action, true)
  }

  /**
   * 挂载 lottie 动画到 container。
   * 调用方：img 类型直接渲染 <img> 不调此方法；lottie 类型在容器 ready 后调用。
   * 数据畸形（非 lottie）返回 false，调用方自行回退。
   * @param opts.autoplay 是否自动播放循环动画；缺省 true。预览场景传 false 只渲染首帧（省 CPU，避免列表 N 个动画同跑）
   */
  const mountLottie = (
    container: HTMLElement,
    opts: { autoplay?: boolean } = {},
  ): boolean => {
    const autoplay = opts.autoplay ?? true
    const resolved = resolveAction(temporaryAction ?? baseAction.value)
    const data = resolved?.data ?? petData.value.lottie
    if (!isLikelyLottie(data)) return false
    try {
      anim = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: autoplay && (resolved?.loop ?? true),
        autoplay,
        animationData: data,
      })
      activeContainer = container
      mountedAction = resolved?.action ?? 'default'
      actionToken += 1
      // ponytail: 静态预览模式——autoplay:false 时 lottie 仍会渲染首帧，显式 goToStop 确保停在首帧不进入渲染循环
      if (!autoplay) {
        anim.goToAndStop(0, true)
      }
      return true
    } catch (e) {
      console.error('[usePetRenderer] lottie 加载失败:', e)
      return false
    }
  }

  const playPetAction = (action: string, force = false): boolean => {
    if (!activeContainer) return false
    const resolved = resolveAction(action)
    if (!resolved) return false
    if (!force && anim && mountedAction === resolved.action) return true
    anim?.destroy()
    anim = null
    const token = ++actionToken
    try {
      anim = lottie.loadAnimation({
        container: activeContainer,
        renderer: 'svg',
        loop: resolved.loop,
        autoplay: true,
        animationData: resolved.data,
      })
      mountedAction = resolved.action
      if (!resolved.loop) {
        anim.addEventListener('complete', () => {
          if (token !== actionToken || temporaryAction !== action) return
          temporaryAction = null
          playPetAction(baseAction.value, true)
        })
      }
      return true
    } catch (e) {
      console.error('[usePetRenderer] lottie action load failed:', e)
      anim = null
      mountedAction = null
      return false
    }
  }

  const pauseLottie = () => anim?.pause()
  const playLottie = () => anim?.play()
  const destroyLottie = () => {
    anim?.destroy()
    anim = null
    activeContainer = null
    mountedAction = null
    temporaryAction = null
    actionToken += 1
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
    setBaseAction,
    playTemporaryAction,
    playPetAction,
  }
}
