/**
 * 「AI 择业」Prompt — 横向对比多个面试/offer，给出推荐项 + 综合评估报告。
 *
 * 仿 interviewPrompts.ts 结构：system 常量 + buildMessages 函数。
 * 不走 aiPrompts.ts 的 buildMessages（那是富文本/全局操作统一入口），择业是面试 tab 专用。
 *
 * 隐私：只发面试核心字段，不发关联简历内容、联系方式、面试问题回答等敏感信息。
 * 联网搜索由调用方按服务商能力决定（webSearchCapability.ts），此处仅在 prompt 中
 * 告知模型是否可联网搜索公司背景辅助判断。
 */

import type { ChatMessage } from './aiService'

/** 单条面试的核心字段子集（已剥离敏感字段，序列化后发往大模型） */
export interface CareerChoiceInterviewInput {
  company: string
  position: string
  salary: string
  location: string
  jd: string
  benefits: string
  /** 状态中文 label（调用方转换，如「面试中」「Offer」） */
  status: string
  /** 轮次摘要，如「共 3 轮，最后一面：HR面」 */
  roundsSummary: string
}

export interface CareerChoiceInput {
  interviews: CareerChoiceInterviewInput[]
  /** 当前服务商是否启用了联网搜索——影响 prompt 是否提示模型可搜索 */
  webSearchEnabled: boolean
  /** 用户自定义的额外比较要求（可选），追加到 user 消息末尾 */
  userPrompt?: string
}

const SYSTEM_PROMPT = `你是一位资深职业选择顾问，擅长在多个 offer / 面试机会之间做横向对比，帮助求职者从多维度综合评估、做出更优选择。

评估维度（综合考量，按重要性灵活权衡）：
1. 薪酬福利：薪资水平、福利待遇、长期回报（期权/股权）
2. 岗位匹配：JD 与个人发展方向的契合度、成长空间、技能提升
3. 公司前景：行业地位、业务前景、稳定性、融资/上市阶段
4. 工作地点：通勤成本、城市发展与落户、生活成本
5. 面试进度：当前流程阶段、拿到 offer 的确定性

输出格式（严格遵守）：
- 第 1 行必须是：推荐：{公司名}（置信度 {0-100 的整数}%）
  - 公司名取自用户提供的面试之一；置信度反映你对该推荐的把握程度
- 第 2 行起为 Markdown 报告，包含以下小节：
  ## 综合对比
  （用表格横向对比各面试的关键维度，一目了然）
  ## 逐项分析
  （按维度逐一展开分析，指出每个机会的优劣）
  ## 推荐理由
  （说明为何推荐该公司，结合用户资料与外部信息）
  ## 风险提示
  （指出推荐项的潜在风险与需进一步确认的点）

要求：
- 客观中立，不偏向任一公司；若信息不足无法判断，置信度相应降低并说明
- 仅基于用户提供的资料${''}做判断，不编造未提供的数据
- 直接输出，不要加「好的」「我来分析」等前缀或解释`

const SYSTEM_PROMPT_WITH_SEARCH = `你是一位资深职业选择顾问，擅长在多个 offer / 面试机会之间做横向对比，帮助求职者从多维度综合评估、做出更优选择。

你具备联网搜索能力，可主动搜索各公司的背景信息（行业地位、业务前景、口碑、融资/上市阶段、近期动态等）辅助判断。请对用户提到的每家公司做必要的外部信息检索，结合用户资料与搜索结果综合评估。

评估维度（综合考量，按重要性灵活权衡）：
1. 薪酬福利：薪资水平、福利待遇、长期回报（期权/股权）
2. 岗位匹配：JD 与个人发展方向的契合度、成长空间、技能提升
3. 公司前景：行业地位、业务前景、稳定性、融资/上市阶段
4. 工作地点：通勤成本、城市发展与落户、生活成本
5. 面试进度：当前流程阶段、拿到 offer 的确定性

输出格式（严格遵守）：
- 第 1 行必须是：推荐：{公司名}（置信度 {0-100 的整数}%）
  - 公司名取自用户提供的面试之一；置信度反映你对该推荐的把握程度
- 第 2 行起为 Markdown 报告，包含以下小节：
  ## 综合对比
  （用表格横向对比各面试的关键维度，一目了然）
  ## 逐项分析
  （按维度逐一展开分析，指出每个机会的优劣，可融入搜索到的公司背景）
  ## 推荐理由
  （说明为何推荐该公司，结合用户资料与搜索到的外部信息）
  ## 风险提示
  （指出推荐项的潜在风险与需进一步确认的点）

要求：
- 客观中立，不偏向任一公司；若信息不足无法判断，置信度相应降低并说明
- 搜索到的外部信息需与用户资料区分，标注为外部信息
- 直接输出，不要加「好的」「我来分析」等前缀或解释`

/** 将单条面试序列化为带编号的文本块 */
function serializeInterview(iv: CareerChoiceInterviewInput, idx: number): string {
  const lines = [
    `【机会 ${idx}】`,
    `公司：${iv.company || '未填写'}`,
    `岗位：${iv.position || '未填写'}`,
    `薪资：${iv.salary || '未填写'}`,
    `地点：${iv.location || '未填写'}`,
    `状态：${iv.status}`,
    `面试进度：${iv.roundsSummary}`,
  ]
  if (iv.jd.trim()) lines.push(`JD：\n${iv.jd.trim()}`)
  if (iv.benefits.trim()) lines.push(`福利待遇：\n${iv.benefits.trim()}`)
  return lines.join('\n')
}

export function buildCareerChoiceMessages(input: CareerChoiceInput): ChatMessage[] {
  const system = input.webSearchEnabled ? SYSTEM_PROMPT_WITH_SEARCH : SYSTEM_PROMPT
  const body = input.interviews
    .map((iv, idx) => serializeInterview(iv, idx + 1))
    .join('\n\n')
  let user = `请对以下 ${input.interviews.length} 个面试/offer 机会做横向对比评估，给出推荐项（含置信度）与 Markdown 报告：\n\n${body}\n\n请严格按系统提示的输出格式输出。`
  // 用户自定义要求：非空才追加，提示模型在评估时重点考虑
  const extra = input.userPrompt?.trim()
  if (extra) {
    user += `\n\n以下是用户的额外要求，请在评估与推荐时重点考虑：\n${extra}`
  }
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}
