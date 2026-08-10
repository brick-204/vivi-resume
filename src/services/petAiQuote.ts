/**
 * 桌宠 AI 动态话术生成器
 *
 * 复用 aiService.streamChat（SSE 流式）+ aiConfigStore（激活配置），
 * 根据场景上下文让大模型现编一句简短中文话术。
 *
 * 无配置 / 调用失败 / 超时统一抛错，由 petStore.sayCategory 回退静态话术。
 * 超时 8s（一句话无需久等，超时即回退，不让气泡空着）。
 */
import { streamChat, type ChatMessage } from '@/services/aiService'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import type { QuoteCategory, TimePeriod } from '@/data/petQuotes'

const TIMEOUT_MS = 8_000
const MAX_TOKENS = 60 // 一句话足够，控成本

export interface PetQuoteContext {
  /** 桌宠名字（注入 system prompt 的人设） */
  name?: string
  /** 是否在编辑器内（enterEditor 场景上下文） */
  inEditor?: boolean
  /** 当前时段（greet 场景上下文） */
  period?: TimePeriod
}

/** 场景语义描述，注入 user prompt */
const CATEGORY_SEMANTICS: Partial<Record<QuoteCategory, string>> = {
  save: '用户刚保存简历成功',
  export: '用户刚导出简历（PDF/图片/JSON）成功',
  enterEditor: '用户刚进入简历编辑器准备开始编辑',
  enterHome: '用户刚进入应用首页',
  enterResumes: '用户刚进入简历列表',
  enterTemplates: '用户刚进入模板市场',
  enterAi: '用户刚进入 AI 设置页',
  enterTrash: '用户刚进入回收站',
  enterSettings: '用户刚进入设置页',
  enterInterviewFootprint: '用户刚进入面试足迹页，这里用地图展示面试地点和路线，帮助回顾求职足迹',
  enterJournal: '用户刚进入求职手账页，这里用卡片网格管理求职笔记和记事本，记录求职心得',
  hover: '用户把鼠标悬停在你身上',
  click: '用户单击了你，点开了你的菜单',
  dragStart: '用户正在拖拽你移动位置',
  dragEnd: '用户刚拖拽完你，你吸附到了屏幕边角的新位置',
  rainy: '用户刚开启了雨夜窗景特效，窗外下起雨了',
  snowy: '用户刚开启了下雪彩蛋，窗外飘起雪花了',
  offer: '用户刚开启了天上掉 offer 彩蛋，满屏 offer 从天而降，祝贺求职顺利',
  offerGot: '用户刚收到一家公司的 offer，求职成功了，表达真诚祝贺',
  rejected: '用户刚被一家公司拒绝，情绪低落，温柔安慰鼓励，不要说教',
  journalCreate: '用户刚新建了一条求职手账笔记，鼓励记录求职心得和面试复盘',
  greet: '向用户打招呼',
  idle: '用户什么都没做，随机说一句闲话或卖萌',
  rest: '用户连续用眼已到设定时长，提醒休息。必须包含"望 6 米外歇 20 秒"的 20-20-20 护眼指令，简短活泼',
  restOn: '用户刚开启了休息提醒功能',
  restOff: '用户刚关闭了休息提醒功能',
  mapOn: '用户刚开启了地图功能，可以用地图查看面试地点和规划路线',
  mapOff: '用户刚关闭了地图功能',
  interviewHintOn: '用户刚开启了面试提示功能，会在面试临近时提醒',
  interviewHintOff: '用户刚关闭了面试提示功能',
  interviewSoon: '用户的面试即将开始（30分钟或10分钟内），提醒做最后准备，简短鼓励',
  // 注：aiChatOn/aiChatOff 故意不映射——开关反馈走静态 pickQuote + say（settingsStore.updatePetAIChatEnabled），
  // 不走 sayCategory/AI（开关切换需即时反馈，不等 AI）。若误调 sayCategory('aiChatOn') 会抛 UNSUPPORTED_CATEGORY。
  // 注：aiError 同样不映射——它在 sayCategory 静态分支直接 pickQuote（AI 不可用时本就不该走 AI）。
}

/**
 * 生成一句桌宠话术。失败/超时/无配置均抛错，由调用方回退静态。
 * 返回 trim 后的非空文本。
 */
export async function generatePetQuote(
  category: QuoteCategory,
  context: PetQuoteContext = {},
): Promise<string> {
  const aiConfigStore = useAIConfigStore()
  const config = aiConfigStore.activeConfig
  // ponytail: 无激活配置或无 apiKey → 抛错回退，不在此处提示用户（静默回退静态话术）
  if (!config || !config.apiKey) {
    throw new Error('NO_CONFIG')
  }

  const name = context.name || 'v仔'
  const semantics = CATEGORY_SEMANTICS[category]
  if (!semantics) {
    // 未配置语义的场景不该走到这里（petStore 已过滤静态场景），兜底抛错
    throw new Error(`UNSUPPORTED_CATEGORY:${category}`)
  }

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是桌宠，名字叫「${name}」，陪伴用户写简历。根据场景用一句简短活泼的中文说话，不超过20字。必须用第三人称自称你的名字（如「${name}来啦」「${name}陪你」），每句话都要带上「${name}」。直接说话内容，不要解释、不要引号、不要emoji堆砌。语气可爱亲切。`,
    },
    {
      role: 'user',
      content: buildUserPrompt(category, semantics, context),
    },
  ]

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const t0 = performance.now()
  try {
    const result = await streamChat(config, messages, () => {}, {
      signal: controller.signal,
      maxTokens: MAX_TOKENS,
      onUsage: (u) => aiConfigStore.recordUsage(config.id, {
        ...u,
        durationMs: performance.now() - t0,
        feature: 'pet',
        modelId: config.modelId,
      }),
    })
    const text = (result.finalText || '').trim()
    if (!text) throw new Error('EMPTY_RESPONSE')
    return text
  } finally {
    clearTimeout(timer)
  }
}

/** 拼接 user prompt：场景语义 + 上下文（时段/编辑器） */
function buildUserPrompt(category: QuoteCategory, semantics: string, context: PetQuoteContext): string {
  const parts: string[] = [`场景：${semantics}。`]
  if (category === 'greet' && context.period) {
    parts.push(`当前时段：${periodLabel(context.period)}。`)
  }
  if (category === 'enterEditor' && context.inEditor) {
    parts.push('用户正在简历编辑器内。')
  }
  parts.push('请说一句话。')
  return parts.join('')
}

function periodLabel(period: TimePeriod): string {
  const labels: Record<TimePeriod, string> = {
    morning: '早晨',
    noon: '中午',
    afternoon: '下午',
    evening: '晚上',
    lateNight: '深夜',
  }
  return labels[period]
}
