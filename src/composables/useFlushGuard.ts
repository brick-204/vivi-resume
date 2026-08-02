/**
 * 落盘兜底守卫（单例）
 *
 * 集中管理 4 个有防抖的 store（resumeStore/aiConfigStore/interviewStore/consultStore）
 * 的「未落盘数据」聚合状态与卸载兜底。
 *
 * 背景：原各 store 各自注册 visibilitychange/pagehide/beforeunload，全是 fire-and-forget
 * async，浏览器在 unload 阶段不等 Promise，编辑后立即关闭浏览器会丢最近编辑。
 * 此处统一注册事件 + 暴露 isFlushing 驱动全屏遮罩，beforeunload 时弹原生「确认离开」框
 * 拦一道，同时尽力触发 flush。
 *
 * 平台边界（非 100% 保证）：原生框文案不可改；部分场景不弹；用户硬选「离开」/杀进程仍拦不住。
 */

import { ref, onScopeDispose } from 'vue'

type Flusher = {
  getDirty: () => boolean
  flush: () => Promise<void> | void
}

// 单例状态（模块顶层，跨组件/store 共享）
const flushers: Flusher[] = []
/** 在途写入 Promise 集合（fire-and-forget 落盘操作注册进来，随 settle 自动清理） */
const pendingWrites = new Set<Promise<unknown>>()
/** 在途写入计数（响应式驱动 hasDirty，比操作 Set 后手动 recompute 稳） */
const pendingCount = ref(0)
/** 是否有任一 store 存在未落盘数据（beforeunload 判定用）：防抖脏标记 或 在途写入 或 上次写失败 */
const hasDirty = ref(false)
/** 是否正在 flush 且需显示遮罩（仅 pagehide/beforeunload 置 true） */
const isFlushing = ref(false)
/** 静默 flush 进行中（visibilitychange 用，不显示遮罩） */
let silentFlushing = false
/** 上次写入是否失败（reject）—— 保持 hasDirty=true 阻拦下次刷新，直到成功写清零，避免静默丢数据 */
const writeFailed = ref(false)

let listenersBound = false

/** 重算 hasDirty（在途写入 或 防抖脏标记 或 上次写失败） */
function recomputeDirty() {
  hasDirty.value = pendingCount.value > 0 || writeFailed.value || flushers.some(f => f.getDirty())
}

/**
 * 追踪一个 fire-and-forget 落盘 Promise：加入在途集合，settle 后自动移除并重算 hasDirty。
 * 各 store 的 persist().catch() / saveXxx().catch() 用 trackPending(...) 包一层，
 * 这样刷新/关闭时 flushGuard 能感知到「有未落盘写入」并弹原生框 + 遮罩。
 * 不改 Promise 行为，返回原 Promise（经 finally 包装），.catch 链不受影响。
 *
 * 超时保护：正常 IDB 写 <100ms、目录模式写大文件（多张照片/多条目逐文件写）可达数秒；
 * 若 Promise 因文件系统挂起/异常迟迟不 settle，STALE_TIMEOUT 后强制移除，避免「后台已无实际写入却每次刷新都阻塞」的体验问题。
 * 超时后该 Promise 若最终 settle，finally 仍会安全 delete（已不在 Set 则 no-op）。
 */
const STALE_TIMEOUT = 8000

export function trackPending<T>(p: Promise<T>): Promise<T> {
  pendingWrites.add(p)
  pendingCount.value = pendingWrites.size
  recomputeDirty()
  // 超时兜底：STALE_TIMEOUT 后强制移除，防止卡住的写永久阻塞 beforeunload
  const timer = setTimeout(() => {
    if (pendingWrites.delete(p)) {
      pendingCount.value = pendingWrites.size
      recomputeDirty()
    }
  }, STALE_TIMEOUT)
  // settle 时：成功则清 writeFailed（数据已落盘），失败则置 writeFailed（阻拦下次刷新 + 警告，避免静默丢数据）
  p.then(
    () => {
      clearTimeout(timer)
      if (pendingWrites.delete(p)) {
        pendingCount.value = pendingWrites.size
      }
      if (writeFailed.value) {
        writeFailed.value = false
        recomputeDirty()
      }
    },
    (err) => {
      clearTimeout(timer)
      pendingWrites.delete(p)
      pendingCount.value = pendingWrites.size
      writeFailed.value = true
      recomputeDirty()
      console.error('[flushGuard] 落盘失败，下次刷新将阻拦提示重试：', err)
    },
  )
  return p
}

/**
 * 触发所有 flusher 落盘。
 * @param silent true=静默落盘不显示遮罩（visibilitychange：页面还活着，用户会切回来）；
 *               false=显示遮罩（pagehide/beforeunload：页面要卸载，引导用户等待）。
 * 静默与带遮罩用独立的 in-flight 标志，互不阻塞——避免静默 flush 进行中时关闭页面被 return 掉、反而不显示遮罩。
 * 先 await 在途写完再跑各 flusher 的 flush（避免在途写与 flush 写竞态）。
 */
async function flushAll(silent: boolean) {
  if (silent) {
    if (silentFlushing) return
    silentFlushing = true
    try {
      // 先等在途 fire-and-forget 写完成（若有），避免与下方 flusher.flush 重复写冲突
      if (pendingWrites.size > 0) {
        await Promise.allSettled([...pendingWrites])
      }
      await Promise.allSettled(flushers.map(f => f.flush()))
    } finally {
      recomputeDirty()
      silentFlushing = false
    }
    return
  }
  if (isFlushing.value) return
  // ponytail: 一进来就显示遮罩，让用户立刻看到反馈；否则若先 await 在途写（快），遮罩没机会渲染
  isFlushing.value = true
  try {
    // 先等在途 fire-and-forget 写完成（若有），避免与下方 flusher.flush 重复写冲突
    if (pendingWrites.size > 0) {
      await Promise.allSettled([...pendingWrites])
    }
    await Promise.allSettled(flushers.map(f => f.flush()))
  } finally {
    recomputeDirty()
    isFlushing.value = false
  }
}

function onVisibility() {
  // 切 Tab/最小化/切应用：页面变 hidden 但通常还活着，静默趁早落盘，不弹遮罩（用户马上会切回来）
  if (document.hidden) flushAll(true)
}
function onPageHide() {
  // 页面要卸载：显示遮罩引导等待（若用户已离开则尽力而为）
  flushAll(false)
}
function onBeforeUnload(e: BeforeUnloadEvent) {
  recomputeDirty()
  if (!hasDirty.value) return
  // 触发浏览器原生「确认离开」框（文案不可改，平台限制）
  e.preventDefault()
  e.returnValue = ''
  // 同步尽力触发 flush；用户点「留下」后遮罩可见，点「离开」则尽力而为
  flushAll(false)
}

function bindListeners() {
  if (listenersBound || typeof window === 'undefined') return
  listenersBound = true
  window.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('beforeunload', onBeforeUnload)
}

function unbindListeners() {
  if (!listenersBound) return
  listenersBound = false
  window.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pagehide', onPageHide)
  window.removeEventListener('beforeunload', onBeforeUnload)
}

/**
 * 注册一个 store 的 dirty 判定 + flush 逻辑。
 * 各 store 在 setup 内调用一次；返回的 unregister 通常无需手动调（store 随 App 生命周期）。
 */
export function registerFlush(getDirty: () => boolean, flush: () => Promise<void> | void) {
  const flusher: Flusher = { getDirty, flush }
  flushers.push(flusher)
  bindListeners()
  recomputeDirty()
  return () => {
    const i = flushers.indexOf(flusher)
    if (i !== -1) flushers.splice(i, 1)
    recomputeDirty()
  }
}

/**
 * 获取守卫状态（App.vue 调用一次以绑定单例生命周期 + 驱动遮罩）。
 * store 内调 registerFlush 时无需调本函数。
 */
export function useFlushGuard() {
  bindListeners()
  onScopeDispose(unbindListeners)
  return { isFlushing, hasDirty }
}
