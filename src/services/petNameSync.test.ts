/**
 * 调查测试2：验证 getDesktopPetById 在切换到自定义桌宠时返回正确名字，
 * 以及 loadAnim 等价逻辑能否正确同步 petName。
 *
 * 模拟 DesktopPet.vue:loadAnim 的核心两行：
 *   petData.value = getDesktopPetById(petId)
 *   petStore.petName = petData.value?.name
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePetStore } from '@/stores/petStore'
import {
  getDesktopPetById,
  getDesktopPetAnimationKeys,
  getDesktopPetDragAction,
  getDesktopPetRunFacing,
  getIdleLoopActions,
  loadDesktopPetAnimation,
  setCustomPetsCache,
  DEFAULT_PET_ID,
  type CustomDesktopPet,
} from '@/config/desktopPets'

describe('切换桌宠时 petName 同步', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('从内置桌宠切换到自定义桌宠，getDesktopPetById 返回自定义名字', () => {
    const customPet: CustomDesktopPet = {
      id: 'custom-abc',
      name: '小猫咪',
      type: 'img',
      src: 'data:image/png;base64,xxx',
    }
    setCustomPetsCache([customPet])

    const petStore = usePetStore()

    // 模拟 loadAnim(DEFAULT_PET_ID)
    let petData = getDesktopPetById(DEFAULT_PET_ID)
    petStore.petName = petData?.name
    expect(petStore.petName).toBe('v仔')

    // 模拟 loadAnim('custom-abc')
    petData = getDesktopPetById('custom-abc')
    petStore.petName = petData?.name
    expect(petStore.petName).toBe('小猫咪')
  })

  it('从自定义桌宠A切换到自定义桌宠B', () => {
    const pets: CustomDesktopPet[] = [
      { id: 'custom-a', name: 'aaa', type: 'img', src: 'x' },
      { id: 'custom-b', name: 'bbb', type: 'img', src: 'y' },
    ]
    setCustomPetsCache(pets)
    const petStore = usePetStore()

    let petData = getDesktopPetById('custom-a')
    petStore.petName = petData?.name
    expect(petStore.petName).toBe('aaa')

    petData = getDesktopPetById('custom-b')
    petStore.petName = petData?.name
    expect(petStore.petName).toBe('bbb')
  })

  it('切换到不存在的 id 回退默认桌宠', () => {
    setCustomPetsCache([])
    const petStore = usePetStore()
    const petData = getDesktopPetById('not-exist')
    petStore.petName = petData?.name
    expect(petStore.petName).toBe('v仔')
  })

  it('早期空名称自定义桌宠补齐名称，不回退 v仔', () => {
    setCustomPetsCache([{ id: 'custom-legacy', name: '  ', type: 'img', src: 'x' }])
    expect(getDesktopPetById('custom-legacy').name).toBe('自定义桌宠')
  })

  it('空闲动作按设定顺序轮播，并让打哈欠紧接伸懒腰', () => {
    const lottie = { layers: [] }
    expect(getIdleLoopActions({
      idle: lottie,
      'look-around': lottie,
      wave: lottie,
      thinking: lottie,
      read: lottie,
      yawn: lottie,
      stretch: lottie,
      sleep: lottie,
      'walk-left': lottie,
    })).toEqual(['idle', 'look-around', 'wave', 'thinking', 'read', 'yawn', 'stretch', 'sleep'])
  })

  it('v仔内置创作主题的交互、空闲和拖拽动作', () => {
    expect(getDesktopPetAnimationKeys(getDesktopPetById('v-za'))).toEqual([
      'click', 'happy', 'hover', 'idle', 'jump-down', 'jump-up', 'look-around',
      'read', 'sleep', 'thinking', 'walk-left', 'walk-right', 'wave',
    ])
  })

  it('内置桌宠仅在动作需要时加载对应资源', async () => {
    const vzai = getDesktopPetById('v-za')
    const xiaoyin = getDesktopPetById('xiao-yin')

    expect(await loadDesktopPetAnimation(vzai, 'idle')).toMatchObject({ layers: expect.any(Array) })
    expect(vzai.lottieAnimations?.idle).toMatchObject({ layers: expect.any(Array) })
    expect(vzai.lottieAnimations?.happy).toBeUndefined()
    expect(xiaoyin.lottieAnimations).toBeUndefined()
  })

  it('拖拽锁定跑跳类别，但允许同类动作反向', () => {
    expect(getDesktopPetDragAction(8, 2)).toBe('walk-right')
    expect(getDesktopPetDragAction(-8, 2)).toBe('walk-left')
    expect(getDesktopPetDragAction(-8, -8)).toBe('walk-left')
    expect(getDesktopPetDragAction(-8, 8)).toBe('walk-left')
    expect(getDesktopPetDragAction(8, -8)).toBe('walk-right')
    expect(getDesktopPetDragAction(8, 8)).toBe('walk-right')
    expect(getDesktopPetDragAction(2, -8)).toBe('jump-up')
    expect(getDesktopPetDragAction(2, 8)).toBe('jump-down')
    expect(getDesktopPetDragAction(-8, -80, 'run')).toBe('walk-left')
    expect(getDesktopPetDragAction(8, 80, 'run')).toBe('walk-right')
    expect(getDesktopPetDragAction(-80, -8, 'jump')).toBe('jump-up')
    expect(getDesktopPetDragAction(80, 8, 'jump')).toBe('jump-down')
    expect(getDesktopPetRunFacing(-1)).toBe(-1)
    expect(getDesktopPetRunFacing(1)).toBe(1)
    expect(getDesktopPetRunFacing(0)).toBeNull()
    expect(getDesktopPetDragAction(0, 0)).toBeNull()
  })
})
