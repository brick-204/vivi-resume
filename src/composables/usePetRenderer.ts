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
import {
  getDesktopPetById,
  getDesktopPetAnimationKeys,
  loadDesktopPetAnimation,
  DEFAULT_PET_ID,
} from '@/config/desktopPets'

export type MountLottieResult = 'mounted' | 'cancelled' | 'invalid'

export function usePetRenderer() {
  const containerRef = ref<HTMLElement | null>(null)
  let anim: ReturnType<typeof lottie.loadAnimation> | null = null

  /** 当前 pet 数据（由调用方在切换时更新，供 computed 读取 type/src） */
  const petData = ref(getDesktopPetById(DEFAULT_PET_ID))

  const isImg = computed(() => petData.value.type === 'img' && !!petData.value.src)
  const imgSrc = computed(() => (isImg.value ? petData.value.src! : ''))
  const lottieData = computed(() => petData.value.lottie)

  type ResolvedAction = { action: string; data: Record<string, unknown>; loop: boolean }
  const LOOP_ACTIONS = new Set<string>([
    'idle',
    'hover',
    'look-around',
    'wave',
    'read',
    'thinking',
    'walk-left',
    'walk-right',
    'jump-up',
    'jump-down',
    'sleep',
  ])
  let activeContainer: HTMLElement | null = null
  let mountedAction: string | null = null
  let actionToken = 0
  let temporaryActionToken = 0
  const baseAction = ref<string>('idle')
  let temporaryAction: string | null = null
  const completedBaseAction = ref<string | null>(null)

  const resolveAction = async (
    requestedAction: string,
    pet = petData.value,
  ): Promise<ResolvedAction | null> => {
    const candidates = [...new Set([
      requestedAction,
      pet.initialAnimation,
      'idle',
      ...getDesktopPetAnimationKeys(pet),
    ].filter((action): action is string => typeof action === 'string'))]
    for (const selectedAction of candidates) {
      const data = await loadDesktopPetAnimation(pet, selectedAction)
      if (data) {
        return {
          action: selectedAction,
          data,
          loop: selectedAction !== requestedAction || LOOP_ACTIONS.has(selectedAction),
        }
      }
    }
    return null
  }

  const setBaseAction = (action: string) => {
    baseAction.value = action
    if (!temporaryAction) void playPetAction(action)
  }
  const playTemporaryAction = (action: string) => {
    void (async () => {
      const pet = petData.value
      const container = activeContainer
      const token = ++temporaryActionToken
      if (!container) return
      const resolved = await resolveAction(action, pet)
      if (
        !resolved
        || resolved.loop
        || token !== temporaryActionToken
        || petData.value !== pet
        || activeContainer !== container
      ) return
      temporaryAction = action
      await playPetAction(action, true, token)
    })()
  }
  const cancelTemporaryAction = () => {
    temporaryAction = null
    temporaryActionToken += 1
  }

  /**
   * 挂载 lottie 动画到 container。
   * 调用方：img 类型直接渲染 <img> 不调此方法；lottie 类型在容器 ready 后调用。
   * 返回 mounted / cancelled / invalid，只有 invalid 需要调用方回退。
   * @param opts.autoplay 是否自动播放循环动画；缺省 true。预览场景传 false 只渲染首帧（省 CPU，避免列表 N 个动画同跑）
   */
  const mountLottie = async (
    container: HTMLElement,
    opts: { autoplay?: boolean } = {},
  ): Promise<MountLottieResult> => {
    const autoplay = opts.autoplay ?? true
    const pet = petData.value
    const token = ++actionToken
    const resolved = await resolveAction(temporaryAction ?? baseAction.value, pet)
    if (token !== actionToken || petData.value !== pet) return 'cancelled'
    if (!resolved) return 'invalid'
    try {
      anim = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: autoplay && (resolved?.loop ?? true),
        autoplay,
        animationData: resolved.data,
      })
      activeContainer = container
      mountedAction = resolved?.action ?? 'default'
      actionToken += 1
      // ponytail: 静态预览模式——autoplay:false 时 lottie 仍会渲染首帧，显式 goToStop 确保停在首帧不进入渲染循环
      if (!autoplay) {
        anim.goToAndStop(0, true)
      }
      return 'mounted'
    } catch (e) {
      console.error('[usePetRenderer] lottie 加载失败:', e)
      return 'invalid'
    }
  }

  const playPetAction = async (
    action: string,
    force = false,
    expectedTemporaryToken?: number,
  ): Promise<boolean> => {
    if (!activeContainer) return false
    const pet = petData.value
    const token = ++actionToken
    const resolved = await resolveAction(action, pet)
    if (
      !resolved
      || token !== actionToken
      || petData.value !== pet
      || (expectedTemporaryToken !== undefined && expectedTemporaryToken !== temporaryActionToken)
    ) return false
    if (!force && anim && mountedAction === resolved.action) return true
    anim?.destroy()
    anim = null
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
          if (token !== actionToken) return
          if (temporaryAction === action) {
            temporaryAction = null
            void playPetAction(baseAction.value, true)
          } else if (!temporaryAction && baseAction.value === action) {
            completedBaseAction.value = action
          }
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
    completedBaseAction.value = null
    actionToken += 1
    temporaryActionToken += 1
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
    cancelTemporaryAction,
    playPetAction,
    completedBaseAction,
  }
}
