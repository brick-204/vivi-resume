import type { QuoteCategory } from '@/data/petQuotes'
import { isAnyEffectActive } from '@/services/effectServiceFactory'

// 透传互斥锁状态查询，供调用方在触发前判断（混合彩蛋也需尊重锁）
export { isAnyEffectActive }

/**
 * 彩蛋注册表：可扩展的彩蛋系统。
 * 每个彩蛋声明 id / 触发函数 / 触发后桌宠的话术分类。
 * 新增彩蛋（如下雪）只需调 registerEasterEgg 注册一项。
 */
/** 触发选项：bypassLock=true 旁路全局彩蛋互斥锁，仅供混合彩蛋内部叠加调用 */
export interface TriggerOpts {
  bypassLock?: boolean
}

export interface EasterEgg {
  /** 唯一标识 */
  id: string
  /** 触发该彩蛋；返回是否真正触发（被全局互斥锁拦住时返回 false）。
   *  opts.bypassLock=true 时旁路锁，供混合彩蛋叠加调用。 */
  trigger: (opts?: TriggerOpts) => boolean
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

/**
 * 随机触发一个已注册彩蛋。
 * 返回该彩蛋 + 是否真正触发（被全局互斥锁拦住时 actuallyTriggered=false）。
 * 无注册彩蛋返回 null。
 */
export function triggerRandomEasterEgg(): { egg: EasterEgg; actuallyTriggered: boolean } | null {
  if (registry.length === 0) return null
  const egg = registry[Math.floor(Math.random() * registry.length)]
  const actuallyTriggered = egg.trigger()
  return { egg, actuallyTriggered }
}

/**
 * 混合彩蛋：随机抽 2 个不同彩蛋，旁路互斥锁同屏叠加播放。
 * 返回抽中的两个彩蛋；注册数 < 2 返回 null（无法凑双）。
 * 调用方负责说稀有话术，trigger 内部在 bypassLock 下不重复 sayCategory。
 */
export function triggerMixedEasterEgg(): { eggs: EasterEgg[] } | null {
  if (registry.length < 2) return null
  // 不重复抽 2 个：Fisher-Yates 取前两位
  const pool = [...registry]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const eggs = pool.slice(0, 2)
  // 旁路锁依次触发，让两者同屏叠加
  for (const egg of eggs) egg.trigger({ bypassLock: true })
  return { eggs }
}

/** 已注册彩蛋数量（测试用） */
export function getEasterEggCount(): number {
  return registry.length
}
