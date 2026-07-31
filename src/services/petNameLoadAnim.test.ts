/**
 * 调查测试3：模拟 DesktopPet 的 loadAnim 完整逻辑（含 RAF 回退分支），
 * 验证 petName 在各种切换场景下的最终值。
 *
 * 重点验证：lottie 畸形回退分支是否漏更新 petName。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePetStore } from '@/stores/petStore'
import {
  getDesktopPetById,
  setCustomPetsCache,
  DEFAULT_PET_ID,
  isLikelyLottie,
  type CustomDesktopPet,
} from '@/config/desktopPets'

// 模拟修复后 usePetRenderer 的 isImg/mountLottie 行为：
// petName 由 petData 派生同步（等价 DesktopPet.vue 的 watch(petData)），
// 回退分支改 petData 后名字自动跟随，不再脱节。
function makeLoadAnim(petStore: ReturnType<typeof usePetStore>) {
  return (petId: string, mountSucceeds: boolean) => {
    let petData = getDesktopPetById(petId)
    petStore.petName = petData?.name
    const isImg = petData.type === 'img' && !!petData.src
    if (isImg) return
    // RAF 回退（同步模拟）
    if (!mountSucceeds) {
      petData = getDesktopPetById(DEFAULT_PET_ID)
      // 修复后：petData 变更即同步 petName（等价 watch(petData)）
      petStore.petName = petData?.name
    }
  }
}

describe('loadAnim 切换场景下 petName 最终值', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('正常 lottie 桌宠切换：petName 跟随更新', () => {
    const customPets: CustomDesktopPet[] = [
      { id: 'custom-a', name: 'aaa', lottie: { layers: [] } },
      { id: 'custom-b', name: 'bbb', lottie: { layers: [] } },
    ]
    setCustomPetsCache(customPets)
    const petStore = usePetStore()
    const loadAnim = makeLoadAnim(petStore)

    loadAnim('custom-a', true)
    expect(petStore.petName).toBe('aaa')

    loadAnim('custom-b', true)
    expect(petStore.petName).toBe('bbb')
  })

  it('切换到 lottie 畸形的桌宠：回退默认桌宠后 petName 同步为 v仔', () => {
    const customPets: CustomDesktopPet[] = [
      { id: 'custom-a', name: 'aaa', lottie: { layers: [] } },
      { id: 'custom-bad', name: '坏桌宠', lottie: { notLayers: true } as any },
    ]
    setCustomPetsCache(customPets)
    const petStore = usePetStore()
    const loadAnim = makeLoadAnim(petStore)

    loadAnim('custom-a', true)
    expect(petStore.petName).toBe('aaa')

    // 切换到畸形 lottie：mountLottie 失败（isLikelyLottie false）→ 回退默认桌宠
    const badPet = getDesktopPetById('custom-bad')
    const mountSucceeds = isLikelyLottie(badPet.lottie)
    loadAnim('custom-bad', mountSucceeds)
    // 修复后：回退分支同步 petName 为默认桌宠名字，与实际渲染一致
    expect(petStore.petName).toBe('v仔')
  })

  it('关键场景：从畸形桌宠切换回正常桌宠', () => {
    const customPets: CustomDesktopPet[] = [
      { id: 'custom-a', name: 'aaa', lottie: { layers: [] } },
      { id: 'custom-bad', name: '坏桌宠', lottie: { notLayers: true } as any },
    ]
    setCustomPetsCache(customPets)
    const petStore = usePetStore()
    const loadAnim = makeLoadAnim(petStore)

    // 先到畸形桌宠 → 回退默认，petName 同步为 v仔
    loadAnim('custom-bad', false)
    expect(petStore.petName).toBe('v仔')

    // 切换回正常桌宠
    loadAnim('custom-a', true)
    expect(petStore.petName).toBe('aaa')
  })
})
