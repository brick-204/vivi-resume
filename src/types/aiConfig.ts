/**
 * AI 服务配置类型定义
 */

// AI 服务商枚举
export type AIProvider = 'openai' | 'deepseek' | 'moonshot' | 'siliconflow' | 'openrouter' | 'zhipu' | 'qwen' | 'minimax' | 'baichuan' | 'yi' | 'custom'

// AI 操作类型
export type AIOperation = 'polish' | 'simplify' | 'expand' | 'summarize' | 'write' | 'translate' | 'tailor' | 'scan' | 'optimizeFull'

// 服务商信息
export interface AIProviderInfo {
  id: AIProvider
  name: string
  defaultEndpoint: string
  defaultModel: string
  corsFriendly: boolean
}

// AI 服务配置
export interface AIServiceConfig {
  id: string
  name: string
  provider: AIProvider
  modelId: string
  apiKey: string
  endpoint: string
  createdAt: string
  updatedAt: string
}

// 服务商预设列表
export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    corsFriendly: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultEndpoint: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    corsFriendly: true,
  },
  {
    id: 'moonshot',
    name: 'Moonshot (月之暗面)',
    defaultEndpoint: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    corsFriendly: true,
  },
  {
    id: 'zhipu',
    name: '智谱 (GLM)',
    defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    corsFriendly: false,
  },
  {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    corsFriendly: false,
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    defaultEndpoint: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    corsFriendly: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    corsFriendly: true,
  },
  {
    id: 'minimax',
    name: 'MiniMax (海螺)',
    defaultEndpoint: 'https://api.minimax.chat/v1',
    defaultModel: 'MiniMax-Text-01',
    corsFriendly: false,
  },
  {
    id: 'baichuan',
    name: '百川',
    defaultEndpoint: 'https://api.baichuan-ai.com/v1',
    defaultModel: 'Baichuan4',
    corsFriendly: false,
  },
  {
    id: 'yi',
    name: '零一万物 (Yi)',
    defaultEndpoint: 'https://api.lingyiwanwu.com/v1',
    defaultModel: 'yi-lightning',
    corsFriendly: false,
  },
  {
    id: 'custom',
    name: '自定义',
    defaultEndpoint: '',
    defaultModel: '',
    corsFriendly: true,
  },
]

// AI 操作配置
export const AI_OPERATIONS: { id: AIOperation; label: string; icon: string; minChars?: number }[] = [
  { id: 'polish', label: '润色', icon: 'mdi:auto-fix', minChars: 30 },
  { id: 'simplify', label: '简化', icon: 'mdi:text-short', minChars: 30 },
  { id: 'expand', label: '扩展', icon: 'mdi:arrow-expand-horizontal', minChars: 30 },
  { id: 'summarize', label: '总结', icon: 'mdi:format-list-bulleted', minChars: 30 },
  { id: 'write', label: '帮写', icon: 'mdi:pencil-plus' },
  { id: 'translate', label: '翻译', icon: 'mdi:translate', minChars: 10 },
  { id: 'tailor', label: '定制', icon: 'mdi:target', minChars: 30 },
  { id: 'scan', label: 'JD 扫描', icon: 'mdi:text-search', minChars: 30 },
  { id: 'optimizeFull', label: '一键优化', icon: 'mdi:creation' },
]

// 根据 provider id 获取服务商信息
export function getProviderInfo(providerId: AIProvider): AIProviderInfo | undefined {
  return AI_PROVIDERS.find(p => p.id === providerId)
}
