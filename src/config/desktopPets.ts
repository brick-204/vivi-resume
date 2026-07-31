/**
 * 桌宠配置
 * 新增桌宠：往 DESKTOP_PETS 加一项 + 在 src/assets/lottie/ 放对应 JSON 即可。
 * 自定义桌宠：用户上传 lottie.json，经 storageAdapter 持久化，由 setCustomPetsCache 注入内存缓存。
 */
import idleData from '@/assets/lottie/pet-idle.json'

export interface DesktopPetConfig {
  id: string
  name: string
  lottie?: unknown
  /** 桌宠类型：lottie（JSON / .lottie 解析后）/ img（GIF/APNG/WebP/PNG/SVG）。缺省按 lottie 处理 */
  type?: 'lottie' | 'img'
  /** img 类型的 data URL（type=img 时有） */
  src?: string
}

/** 用户自定义桌宠（与 DesktopPetConfig 同构，单独命名区分"用户自定义"语义） */
export interface CustomDesktopPet extends DesktopPetConfig {
  /** 进入回收站的时间戳（仅回收站项有）；复用简历回收站保留天数到期自动清理 */
  deletedAt?: string
}

export const DESKTOP_PETS: DesktopPetConfig[] = [
  { id: 'v-za', name: 'v仔', lottie: idleData },
]

export const DEFAULT_PET_ID = DESKTOP_PETS[0].id

// 自定义桌宠内存缓存：由 store 启动时从存储加载并 setCustomPetsCache 注入
let _customPetsCache: CustomDesktopPet[] = []

/** 设置自定义桌宠内存缓存（store 加载后调用） */
export function setCustomPetsCache(pets: CustomDesktopPet[]): void {
  _customPetsCache = pets
}

/** 返回合并列表（内置 + 自定义），供 UI 遍历 */
export function getAllDesktopPetsSync(): DesktopPetConfig[] {
  return [...DESKTOP_PETS, ..._customPetsCache]
}

export const getDesktopPetById = (id: string): DesktopPetConfig =>
  DESKTOP_PETS.find(p => p.id === id)
  ?? _customPetsCache.find(p => p.id === id)
  ?? DESKTOP_PETS[0]

/**
 * 最小 lottie 结构校验：必须是对象且含 layers 数组。
 * ponytail: 只挡明显非 lottie 的输入（{}、数组、字符串、缺 layers），不做完整 schema 校验。
 * lottie-web 对畸形结构会抛运行时异常，这里前置拦截避免组件崩溃后数据持久化无法自救。
 */
export function isLikelyLottie(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>).layers)
}
