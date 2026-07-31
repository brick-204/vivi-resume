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
})
