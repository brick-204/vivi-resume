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
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import { serializeResumeForEvaluation } from '@/services/resumeSerializer'
import { CONSULT_SYSTEM_PROMPT, RESUME_CONTEXT_TEMPLATE } from '@/services/consultPrompts'
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
    let session = currentSession.value
    if (!session) {
      createSession()
      session = currentSession.value!
    }

    // 构造发送给 streamChat 的 messages（ChatMessage[]，去掉 ConsultMessage 的扩展字段）
    const outgoing: ChatMessage[] = []

    // 注入简历上下文（进入历史）
    if (resumeContextMsg) {
      session.messages.push(resumeContextMsg)
      outgoing.push({ role: 'user', content: resumeContextMsg.content })
    }

    // 用户提问
    const userMsg: ConsultMessage = {
      role: 'user',
      kind: 'user-question',
      content: trimmed,
      timestamp: Date.now(),
    }
    session.messages.push(userMsg)
    outgoing.push({ role: 'user', content: trimmed })

    // 首条提问作为会话标题
    if (session.title === '新会话') {
      session.title = trimmed.slice(0, 20) + (trimmed.length > 20 ? '…' : '')
    }

    // 历史消息（system + 之前的轮次）
    const historyMessages: ChatMessage[] = session.messages
      .slice(0, -outgoing.length) // 排除刚 push 的
      .map(m => ({ role: m.role, content: m.content }))

    const fullMessages = [...historyMessages, ...outgoing]

    // 更新时间戳 & 触发响应式（shallowRef 需整体替换）
    session.updatedAt = Date.now()
    sessions.value = [...sessions.value]

    // 清空挂起
    pendingResumeIds.value = []

    // 流式调用
    isStreaming.value = true
    streamingText.value = ''
    abortController = new AbortController()

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
        sessions.value = [...sessions.value]
        persistSession(session)
        await enforceSessionLimit()
      }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      if (isAbort) {
        // SSE 流式阶段 abort：保留已生成部分 + 标记；fetch 前 abort（streamingText 为空）：移除本轮 user 消息
        if (streamingText.value && sessions.value.some(s => s.id === session.id)) {
          session.messages.push({
            role: 'assistant',
            kind: 'assistant-answer',
            content: streamingText.value + '\n\n_(已取消)_',
            timestamp: Date.now(),
          })
          session.updatedAt = Date.now()
          sessions.value = [...sessions.value]
          persistSession(session)
          await enforceSessionLimit()
        } else {
          session.messages.pop() // 移除 user-question
          if (resumeContextMsg && session.messages[session.messages.length - 1] === resumeContextMsg) {
            session.messages.pop()
          }
          sessions.value = [...sessions.value]
        }
      } else if (err instanceof AIServiceError) {
        naiveMessage.error(AI_ERROR_MESSAGES[err.code] || err.message)
        // 失败时移除本轮的 user 消息与简历上下文（避免历史污染）
        session.messages.pop() // 移除 user-question
        if (resumeContextMsg && session.messages[session.messages.length - 1] === resumeContextMsg) {
          session.messages.pop()
        }
        sessions.value = [...sessions.value]
      } else {
        naiveMessage.error('咨询失败，请重试')
        session.messages.pop()
        sessions.value = [...sessions.value]
      }
    } finally {
      isStreaming.value = false
      streamingText.value = ''
      abortController = null
    }
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
    clearPending,
    togglePendingResume,
    reloadFromStorage,
  }
})
