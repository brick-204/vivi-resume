/**
 * AI 咨询会话 Store
 *
 * 多轮对话记忆 + 全局会话列表持久化（IndexedDB / 目录模式双后端）。
 * 最多保留最近 MAX_CONSULT_SESSIONS 个会话，超出删除最旧。
 *
 * 与其他 AI 操作不同：绕过 buildMessages，直接构造完整 messages 数组
 * （system + 历史轮次 + 可选简历上下文 + 当前提问）后调用 streamChat。
 *
 * 简历上下文由用户主动在抽屉内选择注入，挂起在 pendingResumeIds，
 * 必须与下一轮提问一起发送；切换会话或关闭抽屉时清空挂起状态。
 */

import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { ChatMessage } from '@/services/aiService'
import type { AIServiceConfig } from '@/types/aiConfig'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import { serializeResumeForEvaluation } from '@/services/resumeSerializer'
import { CONSULT_SYSTEM_PROMPT, RESUME_CONTEXT_TEMPLATE, COMPRESS_HISTORY_PROMPT, wrapSummary } from '@/services/consultPrompts'
import {
  shouldCompress,
  partitionCompressible,
  formatHistoryForCompress,
} from '@/services/consultTokens'
import { generateId } from '@/types/resume'
import type { ConsultMessage, ConsultSession } from '@/types/consult'
import { MAX_CONSULT_SESSIONS } from '@/types/consult'
import { useSettingsStore } from '@/stores/settingsStore'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import {
  getAllConsultSessions,
  saveConsultSession,
  deleteConsultSession as deleteConsultSessionFromStorage,
} from '@/utils/storageAdapter'
import { message as naiveMessage } from '@/plugins/naive-ui'

export const useConsultStore = defineStore('consult', () => {
  // 按 updatedAt 降序排列的会话列表
  const sessions = shallowRef<ConsultSession[]>([])
  const currentSessionId = ref<string | null>(null)

  /** 挂起的简历 id（用户在抽屉内选了但还没随提问发送），切换会话/关闭抽屉时清空 */
  const pendingResumeIds = ref<string[]>([])

  /** 流式状态 */
  const isStreaming = ref(false)
  /** 当前流式输出的临时文本（未提交进历史前用于 UI 渲染） */
  const streamingText = ref('')
  let abortController: AbortController | null = null

  // ========== 初始化就绪 Promise ==========

  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // ========== Computed ==========

  const currentSession = computed<ConsultSession | null>(() =>
    sessions.value.find(s => s.id === currentSessionId.value) ?? null,
  )

  /** 当前会话的消息（含 system），供 UI 渲染对话区 */
  const currentMessages = computed<ConsultMessage[]>(() =>
    currentSession.value?.messages ?? [],
  )

  // ========== 持久化（300ms 防抖） ==========

  let _saveTimer: Map<string, ReturnType<typeof setTimeout>> = new Map()

  const persistSession = (session: ConsultSession) => {
    const existing = _saveTimer.get(session.id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      _saveTimer.delete(session.id)
      saveConsultSession(session).catch(e => {
        console.error('[consultStore] persistSession failed:', e)
      })
    }, 300)
    _saveTimer.set(session.id, timer)
  }

  /** 取消某会话的 pending 持久化定时器（删除会话前必须调用，否则已删会话会被定时器写回） */
  const cancelPendingPersist = (id: string) => {
    const t = _saveTimer.get(id)
    if (t) {
      clearTimeout(t)
      _saveTimer.delete(id)
    }
  }

  const flushSession = async (id: string) => {
    const timer = _saveTimer.get(id)
    if (timer) {
      clearTimeout(timer)
      _saveTimer.delete(id)
    }
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      await saveConsultSession(session)
    }
  }

  // ========== 初始化 ==========

  const init = async () => {
    const settingsStore = useSettingsStore()
    await settingsStore.ready

    try {
      const all = await getAllConsultSessions()
      // 按 updatedAt 降序，截断到上限
      all.sort((a, b) => b.updatedAt - a.updatedAt)
      const trimmed = all.slice(0, MAX_CONSULT_SESSIONS)
      sessions.value = trimmed

      // 若截断产生了多余会话，清理存储
      if (trimmed.length < all.length) {
        await Promise.all(
          all.slice(MAX_CONSULT_SESSIONS).map(s => deleteConsultSessionFromStorage(s.id)),
        )
      }

      // 默认选中最新会话（若存在）
      if (trimmed.length > 0) {
        currentSessionId.value = trimmed[0].id
      }
    } catch (e) {
      console.error('[consultStore] 初始化失败:', e)
    } finally {
      _readyResolve()
    }
  }

  // ========== 会话管理 ==========

  /**
   * 用新对象替换 sessions 中对应 session（不可变更新）。
   * shallowRef 下原地改 session 属性不触发响应式：currentMessages computed
   * 依赖 currentSession.value，若 session 引用不变则不重算 → UI 不更新。
   * 改 messages/title 等可变字段后必须走这里替换 + 重新取引用。
   * 返回新 session 对象供调用方继续使用。
   */
  const commitSession = (session: ConsultSession): ConsultSession => {
    const next = { ...session, messages: session.messages }
    sessions.value = sessions.value.map(s => (s.id === session.id ? next : s))
    return next
  }

  /** 新建空会话并切换（不立即持久化，首次发送时才落盘）；流式中禁止新建 */
  const createSession = (): string => {
    if (isStreaming.value) return currentSessionId.value ?? ''
    // 清空挂起状态
    pendingResumeIds.value = []

    const now = Date.now()
    const session: ConsultSession = {
      id: generateId(),
      title: '新会话',
      messages: [{ role: 'system', content: CONSULT_SYSTEM_PROMPT, timestamp: now }],
      createdAt: now,
      updatedAt: now,
    }
    // shallowRef 需整体替换触发响应式
    sessions.value = [session, ...sessions.value]
    currentSessionId.value = session.id
    return session.id
  }

  /** 切换会话，清空挂起简历；流式中禁止切换（避免回复写入错误会话） */
  const switchSession = (id: string) => {
    if (isStreaming.value) return
    pendingResumeIds.value = []
    currentSessionId.value = id
  }

  /** 删除会话；流式中禁止删除当前会话 */
  const deleteSession = async (id: string) => {
    if (isStreaming.value && id === currentSessionId.value) return
    const wasCurrent = currentSessionId.value === id
    cancelPendingPersist(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    await deleteConsultSessionFromStorage(id)

    if (wasCurrent) {
      currentSessionId.value = sessions.value.length > 0 ? sessions.value[0].id : null
    }
    pendingResumeIds.value = []
  }

  /** 重命名会话；流式中禁止重命名（避免与流式写回竞争） */
  const renameSession = async (id: string, title: string) => {
    if (isStreaming.value) return false
    const trimmed = title.trim()
    if (!trimmed) return false // 空标题保留原标题
    const session = sessions.value.find(s => s.id === id)
    if (!session || session.title === trimmed) return false
    session.title = trimmed
    session.updatedAt = Date.now()
    const next = commitSession(session)
    // 重命名是低频操作，直接写不走防抖，避免关闭抽屉时丢失
    await saveConsultSession(next)
    return true
  }

  /** 清空挂起简历（关闭抽屉时调用） */
  const clearPending = () => {
    pendingResumeIds.value = []
  }

  /** 切换某份简历的挂起状态 */
  const togglePendingResume = (resumeId: string) => {
    const idx = pendingResumeIds.value.indexOf(resumeId)
    if (idx === -1) {
      pendingResumeIds.value = [...pendingResumeIds.value, resumeId]
    } else {
      pendingResumeIds.value = pendingResumeIds.value.filter(id => id !== resumeId)
    }
  }

  // ========== 5 会话上限管理 ==========

  /** 确保会话数不超过上限，超出删除最旧（含存储与 pending 定时器） */
  const enforceSessionLimit = async () => {
    if (sessions.value.length <= MAX_CONSULT_SESSIONS) return
    // sessions 已按 updatedAt 降序，最旧在末尾
    const overflow = sessions.value.slice(MAX_CONSULT_SESSIONS)
    sessions.value = sessions.value.slice(0, MAX_CONSULT_SESSIONS)
    overflow.forEach(s => cancelPendingPersist(s.id))
    await Promise.all(overflow.map(s => deleteConsultSessionFromStorage(s.id)))
  }

  // ========== 发送消息（核心） ==========

  /**
   * 发送一轮对话。
   * 若 pendingResumeIds 非空，先注入简历上下文消息（与提问一起发送），发送后清空挂起。
   */
  const sendMessage = async (question: string): Promise<void> => {
    const trimmed = question.trim()
    if (!trimmed || isStreaming.value) return

    const aiConfigStore = useAIConfigStore()
    const config = aiConfigStore.activeConfig
    if (!config) {
      naiveMessage.warning('请先在「AI 服务」配置并激活一个服务商')
      return
    }

    // 若挂起了简历，校验能否取到简历文本
    const resumeStore = useResumeStore()
    let resumeContextMsg: ConsultMessage | null = null
    if (pendingResumeIds.value.length > 0) {
      const resumes = pendingResumeIds.value
        .map(id => resumeStore.resumeList.find(r => r.id === id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))

      if (resumes.length === 0) {
        naiveMessage.warning('所选简历已不存在，请重新选择')
        pendingResumeIds.value = []
        return
      }

      const texts = resumes.map(r => serializeResumeForEvaluation(r))
      resumeContextMsg = {
        role: 'user',
        kind: 'resume-context',
        content: RESUME_CONTEXT_TEMPLATE(texts),
        attachedResumeIds: resumes.map(r => r.id),
        timestamp: Date.now(),
      }
    }

    // 确保有当前会话（惰性创建）
    let session: ConsultSession = currentSession.value!
    if (!currentSession.value) {
      createSession()
      session = currentSession.value!
    }

    // 构造发送给 streamChat 的 messages（ChatMessage[]，去掉 ConsultMessage 的扩展字段）
    const outgoing: ChatMessage[] = []
    // 当轮 push 进 session.messages 的消息（resume-context + user-question），用于回滚与构造历史时显式排除
    const currentTurnMsgs: ConsultMessage[] = []

    // 注入简历上下文（进入历史）
    if (resumeContextMsg) {
      session.messages.push(resumeContextMsg)
      session = commitSession(session)
      currentTurnMsgs.push(resumeContextMsg)
      outgoing.push({ role: 'user', content: resumeContextMsg.content })
    }

    // 进入流式状态（覆盖压缩期 UI；压缩失败静默降级，UI 仍显示"正在思考"）
    isStreaming.value = true
    streamingText.value = ''
    abortController = new AbortController()

    // 上下文超阈值自动压缩（在 push 当轮 user-question 之前，基于历史触发）
    // 硬上限：单次 sendMessage 最多 1 次压缩，不递归
    try {
      if (shouldCompress(session.messages)) {
        const result = await tryCompressHistory(session, config, abortController.signal)
        if (result.ok) {
          applyCompressedHistoryToSession(session, result)
        }
        // 失败静默降级，historyForRequest 保持未压缩
      }
    } catch (e) {
      // 压缩异常不应阻断主流程，静默降级
      console.warn('[consultStore] 历史压缩异常，降级未压缩:', e)
    }

    // 若压缩期被 abort，主请求必然失败，提前走取消语义
    if (abortController.signal.aborted) {
      naiveMessage.info('已取消')
      // 移除当轮已 push 的消息（resume-context），不保留
      currentTurnMsgs.forEach(() => session.messages.pop())
      session = commitSession(session)
      isStreaming.value = false
      streamingText.value = ''
      abortController = null
      return
    }

    // 用户提问
    const userMsg: ConsultMessage = {
      role: 'user',
      kind: 'user-question',
      content: trimmed,
      timestamp: Date.now(),
    }
    session.messages.push(userMsg)
    currentTurnMsgs.push(userMsg)
    outgoing.push({ role: 'user', content: trimmed })

    // 首条提问作为会话标题
    if (session.title === '新会话') {
      session.title = trimmed.slice(0, 20) + (trimmed.length > 20 ? '…' : '')
    }

    // 历史消息：排除当轮 push 的消息（currentTurnMsgs）+ compress-notice（提示不发给模型）
    // 不再用 slice(0, -n) 索引推断——压缩会重排 messages，索引不可靠（ponytail: 修复无简历时 -0 陷阱）
    const currentTurnSet = new Set(currentTurnMsgs)
    const historyMessages: ChatMessage[] = session.messages
      .filter(m => !currentTurnSet.has(m) && m.kind !== 'compress-notice')
      .map(m => ({ role: m.role, content: m.content }))

    const fullMessages = [...historyMessages, ...outgoing]

    // 更新时间戳 & 触发响应式（不可变更新：push user 消息后立即让 UI 显示）
    session.updatedAt = Date.now()
    session = commitSession(session)

    // 清空挂起
    pendingResumeIds.value = []

    try {
      const result = await streamChat(
        config,
        fullMessages,
        (chunk) => {
          streamingText.value += chunk
          // 实时更新会话引用以触发 UI（shallowRef 整体替换代价高，用 streamingText 渲染）
        },
        {
          signal: abortController.signal,
          onUsage: (u) => aiConfigStore.addUsage(u),
          maxTokens: 2048,
        },
      )

      // 流式结束，push assistant 消息
      // 注意：fetch 连接前 abort 时 streamChat 返回 {finalText: ''}（accumulatedText 为空），
      // 此时不应 push 空消息；SSE 阶段 abort 会抛 AbortError 进 catch（见下），不走此分支
      if (result.finalText && sessions.value.some(s => s.id === session.id)) {
        session.messages.push({
          role: 'assistant',
          kind: 'assistant-answer',
          content: result.finalText,
          timestamp: Date.now(),
        })
        session.updatedAt = Date.now()
        session = commitSession(session)
        persistSession(session)
        await enforceSessionLimit()
      }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      // 统一用 currentTurnSet 过滤移除当轮 push 的消息（resume-context + user-question）
      // 不再用 pop()+末尾比较——压缩成功后 messages 被重排，末尾不再是 resumeContextMsg
      const toRemove = new Set(currentTurnMsgs)
      session.messages = session.messages.filter(m => !toRemove.has(m))

      if (isAbort) {
        // SSE 流式阶段 abort：保留已生成部分 + 标记；fetch 前 abort（streamingText 为空）：仅移除当轮消息
        if (streamingText.value && sessions.value.some(s => s.id === session.id)) {
          session.messages.push({
            role: 'assistant',
            kind: 'assistant-answer',
            content: streamingText.value + '\n\n_(已取消)_',
            timestamp: Date.now(),
          })
          session.updatedAt = Date.now()
          session = commitSession(session)
          persistSession(session)
          await enforceSessionLimit()
        } else {
          session = commitSession(session)
        }
      } else if (err instanceof AIServiceError) {
        naiveMessage.error(AI_ERROR_MESSAGES[err.code] || err.message)
        session = commitSession(session)
      } else {
        naiveMessage.error('咨询失败，请重试')
        session = commitSession(session)
      }
    } finally {
      isStreaming.value = false
      streamingText.value = ''
      abortController = null
    }
  }

  // ========== 历史压缩（方案 A：摘要注入前置消息） ==========

  /** 压缩结果 */
  interface CompressResult {
    ok: boolean
    /** 新的 history-summary 消息（替换旧 summary + 被压缩段） */
    summaryMsg?: ConsultMessage
    /** 被压缩归档的原始消息（含旧 summary 若有） */
    archivedOriginal?: ConsultMessage[]
    /** 压缩后保留在 messages 里的其余消息（不含 systemMsg，已剔除被压缩段与旧 summary） */
    newMessages?: ConsultMessage[]
  }

  /**
   * 调用一次非流式 streamChat 把历史压缩为摘要。
   * onChunk 传空函数取 finalText；maxTokens 800。
   * 失败（AIServiceError / 空 finalText / abort）返回 { ok: false }，不提示用户。
   */
  const tryCompressHistory = async (
    session: ConsultSession,
    config: AIServiceConfig,
    signal: AbortSignal,
  ): Promise<CompressResult> => {
    const { systemMsg, toCompress, toRetain, oldSummary } = partitionCompressible(session.messages)
    if (toCompress.length === 0) return { ok: false }

    const historyText = formatHistoryForCompress(toCompress, oldSummary)
    const compressMessages: ChatMessage[] = [
      {
        role: 'system',
        content: COMPRESS_HISTORY_PROMPT.replace('{{HISTORY}}', historyText),
      },
    ]

    try {
      const result = await streamChat(
        config,
        compressMessages,
        () => {}, // 非流式：忽略 chunk
        { signal, maxTokens: 800 },
      )
      const summary = result.finalText.trim()
      if (!summary) return { ok: false }

      const now = Date.now()
      const summaryMsg: ConsultMessage = {
        role: 'system',
        kind: 'history-summary',
        content: wrapSummary(summary),
        timestamp: now,
      }
      // 归档被压缩的原始段 + 旧 summary（若有）
      const archivedOriginal: ConsultMessage[] = [...toCompress]
      if (oldSummary) archivedOriginal.unshift(oldSummary)

      // newMessages = [systemMsg, summaryMsg, ...toRetain 去掉旧 summary]
      const filteredRetain = oldSummary
        ? toRetain.filter(m => m !== oldSummary)
        : toRetain
      const newMessages: ConsultMessage[] = [systemMsg, summaryMsg, ...filteredRetain]

      return { ok: true, summaryMsg, archivedOriginal, newMessages }
    } catch (err) {
      // abort 或 AIServiceError 都静默降级
      console.warn('[consultStore] 历史压缩失败，降级未压缩:', err)
      return { ok: false }
    }
  }

  /**
   * 把压缩结果应用到 session：替换 messages、追加 archivedMessages、插入 compress-notice 提示。
   * 触发响应式 + 持久化。
   */
  const applyCompressedHistoryToSession = (session: ConsultSession, result: CompressResult) => {
    if (!result.ok || !result.newMessages || !result.summaryMsg || !result.archivedOriginal) return

    // 追加归档副本
    // ponytail: archivedMessages 暂仅写不读（保留原始历史副本作安全网，未来"展开历史"功能可读）；
    //           无裁剪上限，单会话压缩超 50 次时考虑裁剪（当前 5 会话上限下量级可控）
    session.archivedMessages = [
      ...(session.archivedMessages ?? []),
      ...result.archivedOriginal,
    ]
    // 替换 messages
    session.messages = result.newMessages
    // 插入 compress-notice 提示到末尾（UI 按 kind 渲染居中 chip，位置不影响；发给模型时被 filter 排除）
    session.messages.push({
      role: 'user',
      kind: 'compress-notice',
      content: `已自动整理历史对话（${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}）`,
      timestamp: Date.now(),
    })
    session.updatedAt = Date.now()
    commitSession(session)
    persistSession(session)
  }

  /** 中止当前流式 */
  const abort = () => {
    abortController?.abort()
  }

  // 页面关闭前 flush 当前会话
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (currentSessionId.value) {
        // 同步触发（async 在 beforeunload 里不可靠，但 saveConsultSession 内部走 idb/file 已是异步尽力而为）
        flushSession(currentSessionId.value)
      }
    })
  }

  // 初始化
  init()

  // ========== 重新加载（目录模式切换后调用） ==========

  const reloadFromStorage = async () => {
    // 等 init 完成后再重载，避免与 init 并发读 IndexedDB 互相覆盖
    await ready
    // 清理在途状态：若正在流式，先中止；清空 pending 持久化定时器，避免旧快照写回覆盖新数据
    if (isStreaming.value) {
      abortController?.abort()
    }
    _saveTimer.forEach(t => clearTimeout(t))
    _saveTimer.clear()
    isStreaming.value = false
    streamingText.value = ''
    abortController = null

    try {
      const all = await getAllConsultSessions()
      all.sort((a, b) => b.updatedAt - a.updatedAt)
      sessions.value = all.slice(0, MAX_CONSULT_SESSIONS)
      if (currentSessionId.value && !sessions.value.some(s => s.id === currentSessionId.value)) {
        currentSessionId.value = sessions.value.length > 0 ? sessions.value[0].id : null
      } else if (!currentSessionId.value && sessions.value.length > 0) {
        currentSessionId.value = sessions.value[0].id
      }
      pendingResumeIds.value = []
    } catch (e) {
      console.error('[consultStore] reloadFromStorage 失败:', e)
    }
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    currentMessages,
    pendingResumeIds,
    isStreaming,
    streamingText,
    ready,
    sendMessage,
    abort,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    clearPending,
    togglePendingResume,
    reloadFromStorage,
  }
})
