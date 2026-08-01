import type { QuoteCategory } from '@/data/petQuotes'

/**
 * 彩蛋注册表：可扩展的彩蛋系统。
 * 每个彩蛋声明 id / 触发函数 / 触发后桌宠的话术分类。
 * 新增彩蛋（如下雪）只需调 registerEasterEgg 注册一项。
 */
export interface EasterEgg {
  /** 唯一标识 */
  id: string
  /** 触发该彩蛋的函数 */
  trigger: () => void
  /** 触发后桌宠说的话术分类（雨夜 'rainy'，未来下雪 'snowy' 等） */
  quoteCategory: QuoteCategory
  /**
   * trigger 内部已自行调用 sayCategory（如信封需传 firstname/company 变量）。
   * 为 true 时，桌宠随机触发后不再重复 sayCategory。
   */
  internalSay?: boolean
}

const registry: EasterEgg[] = []

/** 注册一个彩蛋（按 id 去重，重复注册忽略） */
export function registerEasterEgg(egg: EasterEgg): void {
  if (registry.some(e => e.id === egg.id)) return
  registry.push(egg)
}

/** 随机触发一个已注册彩蛋，返回该彩蛋（供调用方 sayCategory）；无注册彩蛋返回 null */
export function triggerRandomEasterEgg(): EasterEgg | null {
  if (registry.length === 0) return null
  const egg = registry[Math.floor(Math.random() * registry.length)]
  egg.trigger()
  return egg
}

/** 已注册彩蛋数量（测试用） */
export function getEasterEggCount(): number {
  return registry.length
}
