/**
 * 「我的面试」tab 的 AI Prompt。
 *
 * 仿 consultPrompts.ts 结构：每个操作导出 system prompt 常量 + buildMessages 函数。
 * 三种操作：模拟面试 / 面试复盘 / JD 解析。
 *
 * 不走 aiPrompts.ts 的 buildMessages（那是富文本/全局操作的统一入口），
 * 这里是 interview tab 专用，独立维护，与 consultPrompts 同思路。
 */

import type { ChatMessage, ContentPart } from './aiService'

// ========== a. 模拟面试 ==========

export const MOCK_INTERVIEW_PROMPT = `你是一位资深面试官，根据目标岗位和 JD 生成针对性面试题。

要求：
1. 覆盖三类题目：行为面试题、技术面试题、深挖项目题
2. 每道题附「考察点」，说明这道题想了解候选人哪方面能力
3. 题目难度梯度合理，从易到难
4. 用 Markdown 列表输出，结构清晰

输出格式示例：
### 行为面试题
1. 题目内容
   - 考察点：xxx

### 技术面试题
1. 题目内容
   - 考察点：xxx

### 深挖项目题
1. 题目内容
   - 考察点：xxx

直接输出题目，不要加「好的，我来生成」之类的前缀。`

export interface MockInterviewInput {
  position: string
  jd: string
  resumeText?: string
  /** JD 截图（压缩后 data URL，可选）。有图时 user 消息走多模态 ContentPart[] */
  jdImages?: string[]
}

export function buildMockInterviewMessages(input: MockInterviewInput): ChatMessage[] {
  const resumePart = input.resumeText?.trim()
    ? `\n候选人简历摘要：\n${input.resumeText}\n`
    : ''
  const user = `岗位：${input.position}\nJD：${input.jd}${resumePart}\n请生成 8-12 道面试题。`
  return [
    { role: 'system', content: MOCK_INTERVIEW_PROMPT },
    { role: 'user', content: withJdImages(user, input.jdImages, '请结合下方 JD 截图与文本理解岗位要求') },
  ]
}

// ========== b. 面试复盘 ==========

export const INTERVIEW_REVIEW_PROMPT = `你是一位面试辅导教练，根据面试记录为候选人做复盘。

要求：
1. 评估整体回答质量，给出整体印象
2. 逐题复盘：指出回答的不足、给出改进建议和参考答案
3. 用 Markdown 输出，分三部分：「整体表现」「逐题复盘」「改进建议」
4. 语气客观、有建设性，不要寒暄

输出格式：
## 整体表现
...

## 逐题复盘
### 问题 1
- 你的回答：...
- 不足：...
- 改进建议：...
- 参考答案：...

## 改进建议
...

直接输出复盘内容，不要加前缀。`

export interface InterviewReviewInput {
  position: string
  jd: string
  questions: string
  answers: string
  /** JD 截图（压缩后 data URL，可选）。有图时 user 消息走多模态 ContentPart[] */
  jdImages?: string[]
}

export function buildInterviewReviewMessages(input: InterviewReviewInput): ChatMessage[] {
  const user = `岗位：${input.position}\nJD：${input.jd}\n面试问题：\n${input.questions}\n我的回答：\n${input.answers}\n请复盘。`
  return [
    { role: 'system', content: INTERVIEW_REVIEW_PROMPT },
    { role: 'user', content: withJdImages(user, input.jdImages, '请结合下方 JD 截图与文本理解岗位要求与面试问题') },
  ]
}

/**
 * 把纯文本 user 文案 + 可选 JD 截图拼成 user content。
 * 无图：返回原 string（存量行为零变化，与 OCR 一致）。
 * 有图：返回 ContentPart[]——文本 part 追加图文引导句 + 每个 data URL 一个 image_url part。
 */
function withJdImages(text: string, images: string[] | undefined, hint: string): string | ContentPart[] {
  const imgs = images?.filter(u => !!u) ?? []
  if (imgs.length === 0) return text
  return [
    { type: 'text', text: `${text}\n${hint}：` },
    ...imgs.map<ContentPart>(url => ({ type: 'image_url', image_url: { url } })),
  ]
}

// ========== c. JD 解析 ==========

export const PARSE_JD_PROMPT = `你是一个 JD 解析器。从 JD 文本中提取结构化信息。

要求：
- 只输出 JSON，不要 markdown 代码块标记（不要 \`\`\`json），不要任何解释文字
- JSON schema：
{
  "company": string,
  "position": string,
  "salary": string,
  "location": string,
  "jd": string
}
- 缺失字段输出空字符串 ""
- "jd" 字段填入清洗后的 JD 正文（去除公司名/薪资等已提取信息后的核心描述）`

export interface ParseJdInput {
  jdText: string
}

export function buildParseJdMessages(input: ParseJdInput): ChatMessage[] {
  const user = `解析以下 JD：\n${input.jdText}`
  return [
    { role: 'system', content: PARSE_JD_PROMPT },
    { role: 'user', content: user },
  ]
}
