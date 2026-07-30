/**
 * 桌宠配置
 * 新增桌宠：往 DESKTOP_PETS 加一项 + 在 src/assets/lottie/ 放对应 JSON 即可。
 */
import idleData from '@/assets/lottie/pet-idle.json'

export interface DesktopPetConfig {
  id: string
  name: string
  lottie: unknown
}

export const DESKTOP_PETS: DesktopPetConfig[] = [
  { id: 'v-za', name: 'v仔', lottie: idleData },
]

export const DEFAULT_PET_ID = DESKTOP_PETS[0].id

export const getDesktopPetById = (id: string): DesktopPetConfig =>
  DESKTOP_PETS.find(p => p.id === id) ?? DESKTOP_PETS[0]
