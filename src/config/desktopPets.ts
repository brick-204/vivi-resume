/**
 * 桌宠配置
 * 新增桌宠：往 DESKTOP_PETS 加一项 + 在 src/assets/lottie/<pet>/ 放对应 JSON 即可。
 * 自定义桌宠：用户上传 lottie.json，经 storageAdapter 持久化，由 setCustomPetsCache 注入内存缓存。
 */
export type LottieAnimationLoader = () => Promise<unknown>

const toActionLoaders = (
  files: Record<string, LottieAnimationLoader>,
  filenamePrefix: string,
): Record<string, LottieAnimationLoader> => Object.fromEntries(
  Object.entries(files).map(([path, loader]) => [
    path.slice(path.lastIndexOf(filenamePrefix) + filenamePrefix.length, -'.json'.length),
    loader,
  ]),
)

// 内置资源按动作分包：首次展示只取 idle，交互时再请求对应 JSON。
const vzaiAnimationLoaders = toActionLoaders(
  import.meta.glob('../assets/lottie/vzai/pet-vzai-*.json', { import: 'default' }),
  'pet-vzai-',
)
const xiaoyinAnimationLoaders = toActionLoaders(
  import.meta.glob('../assets/lottie/xiaoyin/pet-xiaoyin-*.json', { import: 'default' }),
  'pet-xiaoyin-',
)

export interface DesktopPetConfig {
  id: string
  name: string
  /** 用于补偿资源画布留白的视觉倍率，不影响全局桌宠大小设置。 */
  visualScale?: number
  lottie?: unknown
  /** dotLottie action map; absent means legacy single-animation playback. */
  lottieAnimations?: Record<string, unknown>
  /** 内置资源的按需加载器；自定义桌宠直接使用 lottieAnimations。 */
  lottieAnimationLoaders?: Record<string, LottieAnimationLoader>
  /** Initial action declared by the dotLottie manifest. */
  initialAnimation?: string
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
  {
    id: 'v-za',
    name: 'v仔',
    initialAnimation: 'idle',
    lottieAnimationLoaders: vzaiAnimationLoaders,
  },
  {
    id: 'xiao-yin',
    name: '小音',
    visualScale: 1.6,
    initialAnimation: 'idle',
    lottieAnimationLoaders: xiaoyinAnimationLoaders,
  },
]

export const DEFAULT_PET_ID = DESKTOP_PETS[0].id

export type DesktopPetDragAction = 'walk-left' | 'walk-right' | 'jump-up' | 'jump-down' | null
export type DesktopPetDragMode = 'run' | 'jump'
export type DesktopPetRunFacing = -1 | 1

export const getDesktopPetRunFacing = (dx: number): DesktopPetRunFacing | null => (
  dx === 0 ? null : dx < 0 ? -1 : 1
)

export const getDesktopPetDragAction = (
  dx: number,
  dy: number,
  lockedMode?: DesktopPetDragMode,
): DesktopPetDragAction => {
  if (lockedMode === 'run') return dx === 0 ? null : dx < 0 ? 'walk-left' : 'walk-right'
  if (lockedMode === 'jump') return dy === 0 ? null : dy < 0 ? 'jump-up' : 'jump-down'
  if (dx === 0 && dy === 0) return null
  // 斜向拖动优先表现左右跑；仅接近纯竖直时使用上下跳，避免鼠标轻微抖动误判。
  if (Math.abs(dx) * 2 >= Math.abs(dy)) return dx < 0 ? 'walk-left' : 'walk-right'
  return dy < 0 ? 'jump-up' : 'jump-down'
}

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

export const getDesktopPetById = (id: string): DesktopPetConfig => {
  const pet = DESKTOP_PETS.find(p => p.id === id)
    ?? _customPetsCache.find(p => p.id === id)
    ?? DESKTOP_PETS[0]
  // 兼容早期未保存名称的自定义桌宠，避免话术退回默认 v仔。
  return typeof pet.name === 'string' && pet.name.trim() ? pet : { ...pet, name: '自定义桌宠' }
}

export const getDesktopPetAnimationKeys = (pet: DesktopPetConfig): string[] => [
  ...new Set([
    ...Object.keys(pet.lottieAnimations ?? {}),
    ...Object.keys(pet.lottieAnimationLoaders ?? {}),
  ]),
]

/** 加载单个内置动作并缓存；自定义桌宠直接复用其已持久化的动画数据。 */
export async function loadDesktopPetAnimation(
  pet: DesktopPetConfig,
  action: string,
): Promise<Record<string, unknown> | null> {
  const cached = pet.lottieAnimations?.[action]
  if (isLikelyLottie(cached)) return cached
  const loader = pet.lottieAnimationLoaders?.[action]
  if (!loader) {
    const isFallbackAction = action === pet.initialAnimation || action === 'idle'
      || (!pet.lottieAnimations && !pet.lottieAnimationLoaders)
    return isFallbackAction && isLikelyLottie(pet.lottie) ? pet.lottie : null
  }
  try {
    const data = await loader()
    if (!isLikelyLottie(data)) return null
    pet.lottieAnimations ??= {}
    pet.lottieAnimations[action] = data
    if (action === pet.initialAnimation || action === 'idle' || !isLikelyLottie(pet.lottie)) {
      pet.lottie = data
    }
    return data
  } catch (error) {
    console.error(`[desktopPets] 动作加载失败：${pet.id}/${action}`, error)
    return null
  }
}

/** 空闲时可安全轮播的循环动作；走路和悬停必须由真实交互触发。 */
export const getIdleLoopActions = (
  animations?: Record<string, unknown>,
  loaders?: Record<string, LottieAnimationLoader>,
) => {
  const actions = ['idle', 'look-around', 'wave', 'thinking', 'read', 'yawn', 'stretch', 'sleep'] as const
  const available = actions.filter(action => isLikelyLottie(animations?.[action]) || !!loaders?.[action])
  return available.length ? available : (['idle'] as const)
}
/**
 * 最小 lottie 结构校验：必须是对象且含 layers 数组。
 * ponytail: 只挡明显非 lottie 的输入（{}、数组、字符串、缺 layers），不做完整 schema 校验。
 * lottie-web 对畸形结构会抛运行时异常，这里前置拦截避免组件崩溃后数据持久化无法自救。
 */
export function isLikelyLottie(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>).layers)
}
/** Pet size: 100% preserves the existing 64px baseline. */
export const MIN_DESKTOP_PET_SCALE = 1
export const MAX_DESKTOP_PET_SCALE = 2
