/**
 * 服务商联网搜索能力 util
 *
 * 当前架构是纯客户端直调大模型，无独立搜索基础设施。部分服务商在 OpenAI 兼容协议上
 * 扩展了联网搜索参数：智谱/月之暗面走 tools，通义千问走 enable_search。
 * 这里集中维护方言映射，aiService 保持协议中立（通过 extraBody 透传）。
 */
import type { AIProvider } from '@/types/aiConfig'

/** 各服务商启用联网搜索的请求体构造器；未列出的 provider 不支持 */
const WEB_SEARCH_BODY_BUILDERS: Partial<Record<AIProvider, () => Record<string, unknown>>> = {
  zhipu: () => ({ tools: [{ type: 'web_search', web_search: { enable: true, search_result: false } }] }),
  moonshot: () => ({ tools: [{ type: 'builtin_function', function: { name: 'web_search' } }] }),
  qwen: () => ({ enable_search: true }),
}

/** 该服务商是否支持联网搜索 */
export function supportsWebSearch(provider: AIProvider): boolean {
  return provider in WEB_SEARCH_BODY_BUILDERS
}

/**
 * 构造启用联网搜索的额外请求体片段，供 streamChat 的 extraBody 使用。
 * 不支持的 provider 返回 null（调用方传 undefined，不会误发字段）。
 */
export function buildWebSearchBody(provider: AIProvider): Record<string, unknown> | null {
  const builder = WEB_SEARCH_BODY_BUILDERS[provider]
  return builder ? builder() : null
}
