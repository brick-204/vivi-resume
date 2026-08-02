/**
 * AI 服务配置 Store
 * 管理 AI 服务配置的 CRUD + 激活态
 */

import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { AIServiceConfig } from '@/types/aiConfig'
import { generateId } from '@/types/resume'
import { useSyncLock } from '@/composables/useSyncLock'
import { registerFlush, trackPending } from '@/composables/useFlushGuard'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  getAllAIConfigs,
  saveAIConfig,
  deleteAIConfig as deleteAIConfigFromStorage,
  getActiveAIConfigId,
  setActiveAIConfigId,
  getMeta,
  setMeta,
  getAIUsage,
  setAIUsage,
  getAIConfigTrash,
  saveAIConfigTrash,
  getTrashRetentionDays,
} from '@/utils/storageAdapter'
import { message as naiveMessage } from '@/plugins/naive-ui'

// ponytail: 用量按「配置 × 日期 × 功能」分桶存储，能算今日/总计/按功能拆分/平均响应时间
export type UsageFeature = 'consult' | 'resume' | 'interview' | 'pet'

/** 单次 AI 调用的用量记录（调用点计时后传入） */
export interface UsageRecord {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  durationMs: number
  feature: UsageFeature
  modelId: string            // 用于饼图按模型聚合
}

/** 某配置在某功能上、一个日期桶内的聚合 */
export interface FeatureStat {
  count: number
  prompt: number
  completion: number
  total: number
  totalDurationMs: number
}

/** 一个日期桶：4 个功能的日统计 */
export interface DailyBucket {
  consult: FeatureStat
  resume: FeatureStat
  interview: FeatureStat
  pet: FeatureStat
}

/** 模型在某日的聚合（饼图用，带 configId 维度以支持单配置筛选） */
export interface ModelDailyStat {
  count: number
  total: number
}

/** 整个用量存储 */
export interface UsageStore {
  /** configId → 日期 → 每日桶（趋势图 + 详情页卡片用） */
  byConfig: Record<string, Record<string, DailyBucket>>
  /** configId → modelId → 日期 → 模型统计（饼图用） */
  byModel: Record<string, Record<string, Record<string, ModelDailyStat>>>
}

/** 空桶工厂（避免散落的对象字面量缺字段） */
function emptyBucket(): DailyBucket {
  return {
    consult: emptyStat(),
    resume: emptyStat(),
    interview: emptyStat(),
    pet: emptyStat(),
  }
}
function emptyStat(): FeatureStat {
  return { count: 0, prompt: 0, completion: 0, total: 0, totalDurationMs: 0 }
}
function emptyUsageStoreTop(): UsageStore {
  return { byConfig: {}, byModel: {} }
}

// ponytail: 4 个功能固定枚举，遍历用此常量而非 Object.keys（避免与 FeatureStat 字段混淆）
const FEATURES: UsageFeature[] = ['consult', 'resume', 'interview', 'pet']

// 功能模块中文名（与 UsageDetailPanel 的 featureSections 对齐）
const FEATURE_LABELS: Record<UsageFeature, string> = {
  consult: 'AI 咨询',
  resume: '简历功能',
  interview: '面试功能',
  pet: '桌宠功能',
}

/** 清除超过 keepMonths 个月的旧日期桶（返回新 store）。日期 YYYY-MM-DD 字典序=日期序，直接比较。 */
function pruneOldUsage(store: UsageStore, keepMonths: number): UsageStore {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - keepMonths)
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
  const byConfig: Record<string, Record<string, DailyBucket>> = {}
  const byModel: Record<string, Record<string, Record<string, ModelDailyStat>>> = {}
  for (const [cid, days] of Object.entries(store.byConfig)) {
    if (!days) continue
    const kept: Record<string, DailyBucket> = {}
    for (const [date, bucket] of Object.entries(days)) {
      if (date >= cutoffKey) kept[date] = bucket
    }
    if (Object.keys(kept).length > 0) byConfig[cid] = kept
  }
  for (const [cid, models] of Object.entries(store.byModel)) {
    if (!models) continue
    const keptModels: Record<string, Record<string, ModelDailyStat>> = {}
    for (const [mid, dayMap] of Object.entries(models)) {
      if (!dayMap) continue
      const keptDays: Record<string, ModelDailyStat> = {}
      for (const [date, s] of Object.entries(dayMap)) {
        if (date >= cutoffKey) keptDays[date] = s
      }
      if (Object.keys(keptDays).length > 0) keptModels[mid] = keptDays
    }
    if (Object.keys(keptModels).length > 0) byModel[cid] = keptModels
  }
  return { byConfig, byModel }
}

/**
 * 把任意结构（新 {byConfig,byModel} / 旧 Record<cid,Record<date,DailyBucket>> / null）
 * 归一化为 UsageStore。供 bind/unbind/resync 迁移时复用，避免重复判断旧结构。
 */
function normalizeUsage(raw: unknown): UsageStore {
  if (!raw || typeof raw !== 'object') return emptyUsageStoreTop()
  const r = raw as Record<string, unknown>
  if ('byConfig' in r) return raw as UsageStore
  // 旧结构：Record<cid, Record<date, DailyBucket>>，无 byModel
  return { byConfig: raw as Record<string, Record<string, DailyBucket>>, byModel: {} }
}

/**
 * 按 configId × 日期 合并两个 UsageStore：逐桶取 count 大者整桶覆盖（不累加）。
 * 防翻倍：同一份用量两边 count 相等时取其一；某天哪边记的调用多就保留哪边（跨设备不丢）。
 * byModel 同理按 (configId, modelId, 日期) 取 count 大者。供 settingsStore 迁移用量。纯函数。
 */
export function mergeUsageStores(a: UsageStore, b: UsageStore): UsageStore {
  const byConfig: Record<string, Record<string, DailyBucket>> = {}
  const byModel: Record<string, Record<string, Record<string, ModelDailyStat>>> = {}
  // byConfig：逐 (cid, date) 桶，count 大者整桶覆盖；相等保留先入者（a）
  const totalCallCount = (bucket: DailyBucket): number =>
    FEATURES.reduce((sum, f) => sum + (bucket[f]?.count ?? 0), 0)
  for (const store of [a, b]) {
    for (const [cid, days] of Object.entries(store.byConfig ?? {})) {
      if (!days) continue
      byConfig[cid] ??= {}
      for (const [date, bucket] of Object.entries(days)) {
        if (!bucket) continue
        const existing = byConfig[cid][date]
        if (!existing || totalCallCount(bucket) > totalCallCount(existing)) {
          byConfig[cid][date] = bucket
        }
      }
    }
  }
  // byModel：逐 (cid, mid, date) 取 count 大者
  for (const store of [a, b]) {
    for (const [cid, models] of Object.entries(store.byModel ?? {})) {
      if (!models) continue
      byModel[cid] ??= {}
      for (const [mid, dayMap] of Object.entries(models)) {
        if (!dayMap) continue
        byModel[cid][mid] ??= {}
        for (const [date, s] of Object.entries(dayMap)) {
          if (!s) continue
          const existing = byModel[cid][mid][date]
          if (!existing || s.count > existing.count) {
            byModel[cid][mid][date] = s
          }
        }
      }
    }
  }
  return { byConfig, byModel }
}

/** 导出归一化，供 settingsStore 把读到的原始数据转成可合并的 UsageStore */
export { normalizeUsage }

/** getUsageDetail 返回的聚合结果 */
export interface UsageDetail {
  today: FeatureStat
  total: FeatureStat
  byFeature: { today: DailyBucket; total: DailyBucket }
  avgDurationMs: number
  hasData: boolean
}

/** 范围图表数据（饼图 + 趋势） */
export interface RangeData {
  /** 饼图：按 modelId 汇总 */
  modelPie: { name: string; count: number; total: number }[]
  /** 饼图：按功能模块汇总 */
  featurePie: { name: string; count: number; total: number }[]
  /** 趋势：每个时间点（含各功能明细，供拆分趋势图叠加功能线） */
  trend: {
    label: string
    count: number
    total: number
    /** 各功能该天的值，key = UsageFeature */
    features: Record<UsageFeature, { count: number; total: number }>
  }[]
}

export const useAIConfigStore = defineStore('aiConfig', () => {
  const configs = ref<AIServiceConfig[]>([])
  const activeConfigId = ref<string | null>(null)

  // 同步锁
  const { isLocked } = useSyncLock()

  // 用量追踪：byConfig（趋势图+卡片）+ byModel（饼图）
  const usageByConfig = ref<UsageStore>(emptyUsageStore())

  // 回收站：软删除的配置暂存（对齐 interviewStore，trash 走 meta 数组）
  const trash = shallowRef<AIServiceConfig[]>([])
  const trashRetentionDays = ref(30)

  // ========== 初始化就绪 Promise（与 resumeStore 一致）==========
  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // ========== Computed ==========

  const activeConfig = computed(() =>
    configs.value.find(c => c.id === activeConfigId.value),
  )

  const hasConfigs = computed(() => configs.value.length > 0)

  // ========== 初始化 ==========

  const init = async () => {
    // 等待 settingsStore 就绪（确保 isDirectoryMode 已正确设置）
    const settingsStore = useSettingsStore()
    await settingsStore.ready

    try {
      const [allConfigs, savedActiveId, trashData, retentionDays] = await Promise.all([
        getAllAIConfigs(),
        getActiveAIConfigId(),
        getAIConfigTrash(),
        getTrashRetentionDays(),
      ])
      configs.value = allConfigs
      trash.value = trashData
      trashRetentionDays.value = retentionDays
      // 仅恢复已保存的激活配置；不再自动激活第一个
      // ponytail: 旧逻辑在 savedActiveId 为 null（用户主动停用所有 AI）时仍强制激活第一个，
      //           导致"停用 → 刷新 → 又自动启用"。激活态完全由用户控制，首配由 addConfig 自动激活
      if (savedActiveId && allConfigs.some(c => c.id === savedActiveId)) {
        activeConfigId.value = savedActiveId
      } else {
        activeConfigId.value = null
      }
      // 过期回收站清理
      await cleanupTrash()
    } catch (e) {
      console.error('[aiConfigStore] 初始化失败:', e)
    } finally {
      _readyResolve()
    }

    // 加载历史用量（跟随缓存策略：目录模式走 meta.json，否则 IndexedDB）
    try {
      const saved = await getAIUsage<unknown>()
      if (saved) {
        // 迁移：旧结构是 Record<configId, Record<date, DailyBucket>>（无 byConfig 包装）
        // 新结构是 { byConfig, byModel }
        const s = saved as Record<string, unknown>
        let store: UsageStore
        if (s && typeof s === 'object' && 'byConfig' in s) {
          store = saved as UsageStore
        } else {
          // 旧结构 → 迁到 byConfig，byModel 留空（旧数据无 modelId）
          const oldByConfig = saved as Record<string, Record<string, DailyBucket>>
          store = { byConfig: oldByConfig, byModel: {} }
          console.warn('[aiConfigStore] 迁移旧版用量结构到 byConfig/byModel')
        }
        // 清除超 12 个月的旧数据
        store = pruneOldUsage(store, 12)
        usageByConfig.value = store
      } else {
        // ponytail: 迁移更早的全局 aiTokenUsage。无 configId/feature 归属，直接丢弃。
        const legacy = await getMeta<{ prompt: number; completion: number; total: number }>('aiTokenUsage')
        if (legacy) {
          console.warn('[aiConfigStore] 丢弃无法归属的旧版全局 token 用量:', legacy)
          await setMeta('aiTokenUsage', null)
        }
      }
    } catch {
      // 用量加载失败不影响初始化
    }
  }

  // ========== CRUD ==========

  /** 添加新配置 */
  const addConfig = (data: Omit<AIServiceConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (isLocked.value) return undefined

    const now = new Date().toISOString()
    const config: AIServiceConfig = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    // ponytail: 先入内存让 UI 立即响应，持久化后台执行（与 deleteConfig 一致，避免 IDB/文件写入阻塞弹窗）
    configs.value.push(config)

    const persist = async () => {
      await saveAIConfig(config)
      // 如果是第一个配置，自动激活
      if (configs.value.length === 1) {
        await setActiveConfig(config.id)
      }
    }
    trackPending(persist()).catch(e => {
      console.error('[aiConfigStore] addConfig persist failed:', e)
      naiveMessage.warning('保存未完全同步，请检查存储空间')
    })
    return config
  }

  /** 更新配置 */
  const updateConfig = (id: string, updates: Partial<Omit<AIServiceConfig, 'id' | 'createdAt'>>) => {
    if (isLocked.value) return

    const index = configs.value.findIndex(c => c.id === id)
    if (index === -1) return

    const updated: AIServiceConfig = {
      ...configs.value[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    // ponytail: 先更新内存让 UI 立即响应，持久化后台执行
    configs.value[index] = updated

    const persist = async () => {
      await saveAIConfig(updated)
    }
    trackPending(persist()).catch(e => {
      console.error('[aiConfigStore] updateConfig persist failed:', e)
      naiveMessage.warning('保存未完全同步，请检查存储空间')
    })
  }

  /**
   * 移入回收站（软删除）：从主列表移除 + 打 deletedAt + 推入 trash +
   * 物理删源文件 + trash 落 meta。用量数据保留（恢复后历史用量可见），仅永久删除才清。
   * @returns 是否真正执行（同步期 isLocked / 未找到配置时返回 false，调用方据此决定成功提示）
   */
  const deleteConfig = async (id: string): Promise<boolean> => {
    if (isLocked.value) return false

    const config = configs.value.find(c => c.id === id)
    if (!config) return false
    const wasActive = activeConfigId.value === id
    const now = new Date().toISOString()
    const deleted: AIServiceConfig = { ...config, deletedAt: now }

    // ponytail: 先改内存让 UI 立即响应（popconfirm/dialog 立即关闭），落盘后台执行
    configs.value = configs.value.filter(c => c.id !== id)
    trash.value = [...trash.value, deleted]

    const persist = async () => {
      await Promise.all([
        deleteAIConfigFromStorage(id),
        saveAIConfigTrash(trash.value),
      ])
      // 如果删除的是当前激活的配置，自动激活第一个或置 null
      if (wasActive) {
        if (configs.value.length > 0) {
          await setActiveConfig(configs.value[0].id)
        } else {
          activeConfigId.value = null
          await setActiveAIConfigId(null)
        }
      }
    }
    trackPending(persist()).catch(e => {
      console.error('[aiConfigStore] deleteConfig persist failed:', e)
      naiveMessage.warning('删除未完全同步，请检查存储空间')
    })
    return true
  }

  /** 批量移入回收站 */
  const deleteConfigs = async (ids: string[]) => {
    if (isLocked.value || ids.length === 0) return

    const idSet = new Set(ids)
    const wasActive = activeConfigId.value ? idSet.has(activeConfigId.value) : false
    const now = new Date().toISOString()
    const deleted = configs.value
      .filter(c => idSet.has(c.id))
      .map(c => ({ ...c, deletedAt: now }))
    if (deleted.length === 0) return

    // ponytail: 先改内存让 UI 立即响应，落盘后台执行
    configs.value = configs.value.filter(c => !idSet.has(c.id))
    trash.value = [...trash.value, ...deleted]

    const persist = async () => {
      await Promise.all([
        Promise.all(ids.map(id => deleteAIConfigFromStorage(id))),
        saveAIConfigTrash(trash.value),
      ])
      if (wasActive) {
        if (configs.value.length > 0) {
          await setActiveConfig(configs.value[0].id)
        } else {
          activeConfigId.value = null
          await setActiveAIConfigId(null)
        }
      }
    }
    trackPending(persist()).catch(e => {
      console.error('[aiConfigStore] deleteConfigs persist failed:', e)
      naiveMessage.warning('删除未完全同步，请检查存储空间')
    })
  }

  /** 从回收站恢复：移除 deletedAt + 回到主列表 + 重新落盘源文件 */
  const restoreConfig = async (id: string) => {
    const config = trash.value.find(c => c.id === id)
    if (!config) return
    const restored: AIServiceConfig = { ...config, deletedAt: undefined }
    // ponytail: 先改内存让 UI 立即响应，落盘后台执行（避免 dialog onPositiveClick 等落盘卡住）
    trash.value = trash.value.filter(c => c.id !== id)
    configs.value = [...configs.value, restored]
    trackPending(Promise.all([
      saveAIConfig(restored),
      saveAIConfigTrash(trash.value),
    ])).catch(e => {
      console.error('[aiConfigStore] restoreConfig persist failed:', e)
      naiveMessage.warning('恢复未完全同步，请检查存储空间')
    })
  }

  /** 永久删除（从回收站移除 + 清用量；源文件在 deleteConfig 时已物理删除） */
  const permanentDeleteConfig = async (id: string) => {
    // ponytail: 先改内存让 UI 立即响应，落盘后台执行
    trash.value = trash.value.filter(c => c.id !== id)
    deleteUsage(id)
    trackPending(saveAIConfigTrash(trash.value)).catch(e => {
      console.error('[aiConfigStore] permanentDeleteConfig persist failed:', e)
      naiveMessage.warning('删除未完全同步，请检查存储空间')
    })
  }

  /** 清空 AI 配置回收站（含批量清用量） */
  const emptyTrash = async () => {
    // ponytail: 先清内存让 UI 立即响应，落盘后台执行
    trash.value.forEach(c => deleteUsage(c.id))
    trash.value = []
    trackPending(saveAIConfigTrash([])).catch(e => {
      console.error('[aiConfigStore] emptyTrash persist failed:', e)
      naiveMessage.warning('清空未完全同步，请检查存储空间')
    })
  }

  /** 自动清理过期配置（复用简历保留天数配置） */
  const cleanupTrash = async () => {
    const cutoff = Date.now() - trashRetentionDays.value * 24 * 60 * 60 * 1000
    const valid = trash.value.filter(c => {
      const deletedAt = c.deletedAt ? new Date(c.deletedAt).getTime() : Date.now()
      return deletedAt > cutoff
    })
    if (valid.length !== trash.value.length) {
      // 过期项的用量一并清除
      trash.value.filter(c => !valid.includes(c)).forEach(c => deleteUsage(c.id))
      trash.value = valid
      await saveAIConfigTrash(valid)
    }
  }

  /** 复制配置（含 API Key） */
  const duplicateConfig = (id: string) => {
    if (isLocked.value) return undefined

    const source = configs.value.find(c => c.id === id)
    if (!source) return

    const now = new Date().toISOString()
    const duplicated: AIServiceConfig = {
      ...source,
      id: generateId(),
      name: `${source.name} (副本)`,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    }
    // 先入内存让 UI 立即响应，持久化后台执行（与 deleteConfig 一致，避免文件系统/IDB 写入阻塞）
    configs.value.push(duplicated)

    const persist = async () => {
      await saveAIConfig(duplicated)
    }
    trackPending(persist()).catch(e => {
      console.error('[aiConfigStore] duplicateConfig persist failed:', e)
      naiveMessage.warning('复制未完全同步，请检查存储空间')
    })
    return duplicated
  }

  /** 设置激活配置 */
  const setActiveConfig = async (id: string | null) => {
    activeConfigId.value = id
    await setActiveAIConfigId(id)
  }

  // ========== 用量记录（内存累加，防抖持久化）==========
  let _usageSaveTimer: ReturnType<typeof setTimeout> | null = null

  /** 今日日期串 YYYY-MM-DD（本地时区） */
  const todayKey = () => dateKey(0)
  /** 偏移 days 天的日期串（负数=过去）。days=0 即今天 */
  const dateKey = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  /** 空用量存储 */
  function emptyUsageStore(): UsageStore {
    return { byConfig: {}, byModel: {} }
  }

  /** 累加一次用量到「configId × 今日 × feature」桶 + byModel */
  const recordUsage = (configId: string, record: UsageRecord) => {
    if (!configId) return
    const day = todayKey()
    const store = usageByConfig.value

    // byConfig：日功能桶
    if (!store.byConfig[configId]) store.byConfig[configId] = {}
    if (!store.byConfig[configId][day]) store.byConfig[configId][day] = emptyBucket()
    const bucket = store.byConfig[configId][day]
    const featureStat = bucket[record.feature]
    featureStat.count += 1
    featureStat.prompt += record.prompt_tokens || 0
    featureStat.completion += record.completion_tokens || 0
    featureStat.total += record.total_tokens || 0
    featureStat.totalDurationMs += record.durationMs || 0

    // byModel：configId × modelId × 日期（饼图用）
    if (!store.byModel[configId]) store.byModel[configId] = {}
    const mid = record.modelId || 'unknown'
    if (!store.byModel[configId][mid]) store.byModel[configId][mid] = {}
    const ms = store.byModel[configId][mid][day] ?? { count: 0, total: 0 }
    ms.count += 1
    ms.total += record.total_tokens || 0
    store.byModel[configId][mid][day] = ms

    // 触发响应式（整体替换引用）
    usageByConfig.value = { ...store }

    // 防抖持久化：5 秒内不再有新 usage 才写入
    if (_usageSaveTimer) clearTimeout(_usageSaveTimer)
    _usageSaveTimer = setTimeout(async () => {
      _usageSaveTimer = null
      try {
        // ponytail: usageByConfig 是 Vue reactive，深层全是 proxy，toPlain(structuredClone(toRaw)) 剥不净深层。
        // 用量是纯数字数据，JSON 往返安全可靠地剥离所有 proxy，再交 setAIUsage 跟随缓存策略落盘。
        const plain = JSON.parse(JSON.stringify(usageByConfig.value)) as UsageStore
        await setAIUsage(plain)
      } catch {
        // 持久化失败不影响功能
      }
    }, 5000)
  }

  /**
   * 立即持久化用量（防抖窗口内关闭页面时调用）。
   * @param force true=强制写盘（用量删除/清空场景：无 pending 防抖也必须落盘，否则孤儿用量残留）。
   */
  const flushUsage = async (force = false) => {
    // ponytail: 无 pending 用量早退，避免 flushAll 时无谓写一次 meta（目录模式慢）；
    //           force 路径绕过早退（deleteUsage 改内存后必须落盘，否则刷新后用量回滚）
    if (!force && !_usageSaveTimer) return
    if (_usageSaveTimer) {
      clearTimeout(_usageSaveTimer)
      _usageSaveTimer = null
    }
    try {
      const plain = JSON.parse(JSON.stringify(usageByConfig.value)) as UsageStore
      await setAIUsage(plain)
    } catch {
      // 持久化失败不影响功能
    }
  }

  /** 删除某配置的全部用量（配置删除时联动）。强制落盘，避免永久删除/清空回收站后孤儿用量残留。 */
  const deleteUsage = (configId: string) => {
    const store = usageByConfig.value
    if (!store.byConfig[configId] && !store.byModel[configId]) return
    const next: UsageStore = {
      byConfig: { ...store.byConfig },
      byModel: { ...store.byModel },
    }
    delete next.byConfig[configId]
    delete next.byModel[configId]
    usageByConfig.value = next
    // ponytail: force=true 绕过 flushUsage 早退；trackPending 让 flushGuard 感知在途写、弹遮罩兜底
    trackPending(flushUsage(true)).catch(e => {
      console.error('[aiConfigStore] deleteUsage 落盘失败:', e)
      naiveMessage.warning('用量数据未完全同步，请检查存储空间')
    })
  }

  /** 聚合一组日期桶为 UsageDetail。todayBucket 为今日桶，allBuckets 为全部日期桶（含今日）。 */
  const aggregateBuckets = (todayBucket: DailyBucket, allBuckets: DailyBucket[]): UsageDetail => {
    const totalBucket = emptyBucket()
    for (const bucket of allBuckets) {
      FEATURES.forEach(f => {
        const src = bucket[f] ?? emptyStat()
        totalBucket[f].count += src.count
        totalBucket[f].prompt += src.prompt
        totalBucket[f].completion += src.completion
        totalBucket[f].total += src.total
        totalBucket[f].totalDurationMs += src.totalDurationMs
      })
    }

    const sumStat = (b: DailyBucket): FeatureStat => {
      const s = emptyStat()
      FEATURES.forEach(f => {
        const src = b[f] ?? emptyStat()
        s.count += src.count
        s.prompt += src.prompt
        s.completion += src.completion
        s.total += src.total
        s.totalDurationMs += src.totalDurationMs
      })
      return s
    }
    const todayStat = sumStat(todayBucket)
    const totalStat = sumStat(totalBucket)
    const avgDurationMs = totalStat.count > 0 ? Math.round(totalStat.totalDurationMs / totalStat.count) : 0

    return {
      today: todayStat,
      total: totalStat,
      byFeature: { today: todayBucket, total: totalBucket },
      avgDurationMs,
      hasData: totalStat.count > 0,
    }
  }

  /** 聚合某配置的用量明细：今日 / 总计 / 按功能拆分 / 平均响应时间 */
  const getUsageDetail = (configId: string): UsageDetail => {
    const days = usageByConfig.value.byConfig[configId] ?? {}
    const today = todayKey()
    const todayBucket = days[today] ?? emptyBucket()
    return aggregateBuckets(todayBucket, Object.values(days))
  }

  /** 聚合所有配置的用量明细（全局） */
  const getTotalUsageDetail = (): UsageDetail => {
    const today = todayKey()
    const todayBucket = emptyBucket()
    const allBuckets: DailyBucket[] = []
    for (const days of Object.values(usageByConfig.value.byConfig)) {
      if (!days) continue
      const tb = days[today]
      if (tb) {
        FEATURES.forEach(f => {
          const src = tb[f] ?? emptyStat()
          todayBucket[f].count += src.count
          todayBucket[f].prompt += src.prompt
          todayBucket[f].completion += src.completion
          todayBucket[f].total += src.total
          todayBucket[f].totalDurationMs += src.totalDurationMs
        })
      }
      allBuckets.push(...Object.values(days))
    }
    return aggregateBuckets(todayBucket, allBuckets)
  }

  /** 把 YYYY-MM-DD 转为 Date（本地 00:00） */
  const parseDate = (key: string): Date => {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, (m ?? 1) - 1, d ?? 1)
  }
  /** 枚举 start..end（含）的所有 YYYY-MM-DD */
  const enumDates = (start: string, end: string): string[] => {
    const out: string[] = []
    const d = parseDate(start)
    const last = parseDate(end)
    while (d <= last) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      out.push(`${y}-${m}-${day}`)
      d.setDate(d.getDate() + 1)
    }
    return out
  }

  /**
   * 取时间范围内的图表数据。
   * - 饼图：范围内 byModel 按 modelId 汇总
   * - 趋势：按天展示（1天/3天/多天均按天，不做小时粒度——纯客户端遍历按天最省）
   * configId='__all' 或省略 = 全局；否则单配置
   */
  const getRangeData = (start: string, end: string, configId: string): RangeData => {
    const store = usageByConfig.value
    const isAll = configId === '__all__'
    const cids = isAll ? Object.keys(store.byConfig) : [configId]
    const dates = enumDates(start, end)

    // ---- 饼图：byModel 按 modelId 汇总 ----
    const pieMap = new Map<string, { count: number; total: number }>()
    for (const cid of cids) {
      const models = store.byModel[cid]
      if (!models) continue
      for (const [mid, dayMap] of Object.entries(models)) {
        if (!dayMap) continue
        for (const date of dates) {
          const s = dayMap[date]
          if (!s) continue
          const acc = pieMap.get(mid) ?? { count: 0, total: 0 }
          acc.count += s.count
          acc.total += s.total
          pieMap.set(mid, acc)
        }
      }
    }
    const modelPie = Array.from(pieMap.entries())
      .map(([name, v]) => ({ name, count: v.count, total: v.total }))
      .filter(x => x.count > 0)

    // ---- 功能分布饼图：byConfig 按 feature 汇总 ----
    const featureMap = new Map<UsageFeature, { count: number; total: number }>(
      FEATURES.map(f => [f, { count: 0, total: 0 }])
    )
    for (const cid of cids) {
      for (const date of dates) {
        const bucket = store.byConfig[cid]?.[date]
        if (!bucket) continue
        FEATURES.forEach(f => {
          const s = bucket[f]
          if (!s) return
          const acc = featureMap.get(f)!
          acc.count += s.count
          acc.total += s.total
        })
      }
    }
    const featurePie = FEATURES
      .map(f => ({ name: FEATURE_LABELS[f], count: featureMap.get(f)!.count, total: featureMap.get(f)!.total }))
      .filter(x => x.count > 0)

    // ---- 趋势：按天（含各功能明细） ----
    const trend = dates.map(date => {
      const features = {
        consult: { count: 0, total: 0 },
        resume: { count: 0, total: 0 },
        interview: { count: 0, total: 0 },
        pet: { count: 0, total: 0 },
      } as Record<UsageFeature, { count: number; total: number }>
      let count = 0, total = 0
      for (const cid of cids) {
        const bucket = store.byConfig[cid]?.[date]
        if (bucket) {
          FEATURES.forEach(f => {
            const s = bucket[f] ?? emptyStat()
            count += s.count
            total += s.total
            features[f].count += s.count
            features[f].total += s.total
          })
        }
      }
      return { label: date.slice(5), count, total, features }
    })

    return { modelPie, featurePie, trend }
  }

  // 页面隐藏/关闭时 flush 未持久化的 token 用量
  // ponytail: 统一交由 useFlushGuard 注册三事件 + 驱动保存遮罩，对齐其他 store。
  registerFlush(() => _usageSaveTimer !== null, () => flushUsage())

  // 初始化
  init()

  // ========== 重新加载（目录模式切换后调用） ==========

  /** 从当前存储后端重新加载全部数据 */
  const reloadFromStorage = async () => {
    try {
      const [allConfigs, savedActiveId, trashData, retentionDays] = await Promise.all([
        getAllAIConfigs(),
        getActiveAIConfigId(),
        getAIConfigTrash(),
        getTrashRetentionDays(),
      ])
      configs.value = allConfigs
      trash.value = trashData
      trashRetentionDays.value = retentionDays
      if (savedActiveId && allConfigs.some(c => c.id === savedActiveId)) {
        activeConfigId.value = savedActiveId
      } else {
        // 不自动激活第一个（用户可能已主动停用所有）
        activeConfigId.value = null
      }
      await cleanupTrash()
      // 重新加载用量数据（跟随缓存策略）
      try {
        const saved = await getAIUsage<UsageStore>()
        if (saved && typeof saved === 'object' && 'byConfig' in saved) {
          usageByConfig.value = pruneOldUsage(saved, 12)
        } else if (saved) {
          // 旧结构，迁移
          const oldByConfig = saved as unknown as Record<string, Record<string, DailyBucket>>
          usageByConfig.value = pruneOldUsage({ byConfig: oldByConfig, byModel: {} }, 12)
        } else {
          usageByConfig.value = emptyUsageStore()
        }
      } catch {
        // 用量加载失败不影响主流程
      }
    } catch (e) {
      console.error('[aiConfigStore] reloadFromStorage 失败:', e)
    }
  }

  return {
    configs,
    activeConfigId,
    activeConfig,
    hasConfigs,
    ready,
    usageByConfig,
    trash,
    trashRetentionDays,
    recordUsage,
    flushUsage,
    getUsageDetail,
    getTotalUsageDetail,
    getRangeData,
    deleteUsage,
    addConfig,
    updateConfig,
    deleteConfig,
    deleteConfigs,
    restoreConfig,
    permanentDeleteConfig,
    emptyTrash,
    duplicateConfig,
    setActiveConfig,
    reloadFromStorage,
  }
})
