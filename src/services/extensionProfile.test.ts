import { describe, expect, it } from 'vitest'
import { createEmptyResume } from '@/types/resume'
import { buildExtensionAiConfig, buildExtensionProfile } from './extensionProfile'
import type { AIServiceConfig } from '@/types/aiConfig'

describe('buildExtensionProfile', () => {
  it('只同步非隐藏的填写资料，并把富文本转为纯文本', () => {
    const resume = createEmptyResume()
    resume.basicInfo.name = '张三'
    resume.basicInfo.phone = '13800138000'
    resume.basicInfo.hiddenFields.phone = true
    resume.basicInfo.summary = '<p>前端工程师<br>五年经验</p>'
    resume.workExperience.push({ id: 'w1', company: '隐藏公司', position: '开发', startDate: '', endDate: '', description: '', hidden: true })
    resume.basicInfo.customFields.push({ id: 'c1', label: '证书', value: 'PMP', hidden: false })

    expect(buildExtensionProfile(resume).fields).toEqual([
      { key: 'name', label: '姓名', value: '张三' },
      { key: 'summary', label: '个人简介', value: '前端工程师\n五年经验' },
      { key: 'custom.c1', label: '证书', value: 'PMP' },
    ])
  })

  it('同步年龄、教育描述及项目日期和技术栈，并排除隐藏资料', () => {
    const resume = createEmptyResume()
    resume.basicInfo.age = '28'
    resume.education.push({ id: 'e1', school: '', major: '', degree: '', startDate: '', endDate: '', description: '<p>奖学金</p>' })
    resume.projects.push({ id: 'p1', name: '', role: '', startDate: '2024-01', endDate: '2025-02', description: '', technologies: ['Vue', 'TypeScript'] })
    expect(buildExtensionProfile(resume).fields).toEqual([
      { key: 'age', label: '年龄', value: '28' },
      { key: 'education.0.description', label: '教育 1 · 描述', value: '奖学金' },
      { key: 'project.0.startDate', label: '项目 1 · 开始时间', value: '2024-01' },
      { key: 'project.0.endDate', label: '项目 1 · 结束时间', value: '2025-02' },
      { key: 'project.0.technologies', label: '项目 1 · 技术栈', value: 'Vue、TypeScript' },
    ])
    resume.basicInfo.hiddenFields.age = true
    resume.education[0].hidden = true
    resume.hiddenSections.push('projects')
    expect(buildExtensionProfile(resume).fields).toEqual([])
  })
})

describe('buildExtensionAiConfig', () => {
  const config: AIServiceConfig = {
    id: 'test', name: 'test', provider: 'openai', modelId: 'gpt-6.1-sol',
    endpoint: '', apiKey: 'test-key', createdAt: '', updatedAt: '',
  }

  it.each([
    ['/api/ai/openai/v1', 'https://api.openai.com/v1'],
    ['/api/ai/zhipu/api/paas/v4', 'https://open.bigmodel.cn/api/paas/v4'],
    ['/api/ai/qwen/compatible-mode/v1', 'https://dashscope.aliyuncs.com/compatible-mode/v1'],
    ['/api/ai/minimax/v1', 'https://api.minimax.cn/v1'],
    ['/api/ai/baichuan/v1', 'https://api.baichuan-ai.com/v1'],
    ['/api/ai/yi/v1', 'https://api.lingyiwanwu.com/v1'],
    ['/api/ai/openai/v1/chat/completions?test=1', 'https://api.openai.com/v1/chat/completions?test=1'],
    ['http://localhost:3000/v1', 'http://localhost:3000/v1'],
    ['https://custom.example/v1/chat/completions', 'https://custom.example/v1/chat/completions'],
  ])('将 %s 转为插件可用的地址', (endpoint, expected) => {
    const result = buildExtensionAiConfig({ ...config, endpoint, endpointComplete: true })
    expect(result).toEqual({ endpoint: expected, endpointComplete: true, modelId: config.modelId, apiKey: config.apiKey })
  })

  it.each(['/api/ai/unknown/v1', '/api/ai/openai-evil/v1', 'file:///tmp/key', 'javascript:alert(1)'])('拒绝无法供插件请求的地址 %s', endpoint => {
    expect(() => buildExtensionAiConfig({ ...config, endpoint })).toThrow()
  })
})
