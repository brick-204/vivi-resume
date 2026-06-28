import { validateResumeJSON } from '@/schemas/resumeSchema'

/** 最小合法简历 JSON 对象 */
function makeMinimalValidResume(): Record<string, unknown> {
  return {
    id: 'resume-1',
    title: '我的简历',
    templateId: 'sidebar',
    basicInfo: {
      name: '张三',
      title: '前端工程师',
      photo: '',
      email: 'zhangsan@example.com',
      phone: '13800138000',
      location: '北京',
      website: '',
      summary: '5年前端开发经验',
      gender: '',
      birthday: '',
      age: '',
      expectedCity: '',
      workExperience: '',
      wechat: '',
      qq: '',
      salaryRange: '',
      hiddenFields: {},
      customFields: [],
      fieldOrder: [],
      fieldDisplayMode: {},
    },
    workExperience: [],
    education: [],
    projects: [],
    skills: [],
    selfEvaluation: '',
    customTexts: [],
    customCards: [],
    sectionOrder: [],
    sectionTitles: {},
    hiddenSections: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

describe('resumeSchema', () => {
  describe('validateResumeJSON', () => {
    it('valid complete resume passes', () => {
      const resume = makeMinimalValidResume()
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('missing required field "id" produces error', () => {
      const resume = makeMinimalValidResume()
      delete (resume as any).id
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.some(e => e.path.includes('简历 ID'))).toBe(true)
    })

    it('missing required field "title" produces error', () => {
      const resume = makeMinimalValidResume()
      delete (resume as any).title
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
      expect(result.errors!.some(e => e.path.includes('简历标题'))).toBe(true)
    })

    it('wrong type for "id" (number instead of string) produces error with Chinese message', () => {
      const resume = makeMinimalValidResume()
      resume.id = 12345 as any
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      // Error message should be in Chinese
      const hasChinese = result.errors!.some(e =>
        /[一-龥]/.test(e.message),
      )
      expect(hasChinese).toBe(true)
    })

    it('wrong type for "basicInfo" (string instead of object) produces error', () => {
      const resume = makeMinimalValidResume()
      resume.basicInfo = 'invalid' as any
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
      expect(result.errors!.some(e => e.path.includes('基本信息'))).toBe(true)
    })

    it('invalid JSON string returns parse error', () => {
      const result = validateResumeJSON('{invalid json}')
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBe(1)
      expect(result.errors![0].path).toBe('')
      expect(result.errors![0].message).toContain('JSON')
    })

    it('passthrough allows extra fields', () => {
      const resume = makeMinimalValidResume()
      ;(resume as any).extraField = 'allowed'
      ;(resume as any).anotherExtra = 42
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(true)
    })

    it('error messages contain Chinese characters', () => {
      const resume = makeMinimalValidResume()
      delete (resume as any).templateId
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
      const hasChinese = result.errors!.every(e =>
        /[一-龥]/.test(e.message),
      )
      expect(hasChinese).toBe(true)
    })

    it('missing nested required field in basicInfo produces error with Chinese path', () => {
      const resume = makeMinimalValidResume()
      delete (resume.basicInfo as any).name
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
      expect(result.errors!.some(e => e.path.includes('基本信息') && e.path.includes('姓名'))).toBe(true)
    })

    it('wrong type in array item produces error', () => {
      const resume = makeMinimalValidResume()
      resume.workExperience = [{
        id: 123 as any, // should be string
        company: 'Test',
        position: 'Dev',
        startDate: '2024-01',
        endDate: '2024-06',
        description: 'Work',
      }]
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
    })

    it('missing multiple required fields produces multiple errors', () => {
      const resume = makeMinimalValidResume()
      delete (resume as any).id
      delete (resume as any).title
      delete (resume as any).templateId
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
      expect(result.errors!.length).toBeGreaterThanOrEqual(3)
    })

    it('more than 10 errors includes truncation message', () => {
      // Create a resume with many errors by making many required fields wrong type
      const resume: Record<string, unknown> = {
        id: 1,
        title: 2,
        templateId: 3,
        basicInfo: 4,
        workExperience: 'invalid',
        education: 'invalid',
        projects: 'invalid',
        skills: 'invalid',
        selfEvaluation: 5,
        customTexts: 'invalid',
        customCards: 'invalid',
        sectionOrder: 'invalid',
        sectionTitles: 'invalid',
        hiddenSections: 'invalid',
        createdAt: 6,
        updatedAt: 7,
      }
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
      // Should have exactly 10 errors + 1 truncation message
      expect(result.errors!.length).toBe(11)
      expect(result.errors!.some(e => e.message.includes('错误未显示'))).toBe(true)
    })

    it('accepts optional fields when present with correct types', () => {
      const resume = makeMinimalValidResume()
      resume.themeAccentColor = '#4CAF50'
      resume.lineHeight = 1.6
      resume.bodyFontSize = 14
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(true)
    })

    it('rejects optional field with wrong type', () => {
      const resume = makeMinimalValidResume()
      resume.lineHeight = '1.6' as any // should be number
      const result = validateResumeJSON(JSON.stringify(resume))
      expect(result.success).toBe(false)
    })

    it('empty string input returns parse error', () => {
      const result = validateResumeJSON('')
      expect(result.success).toBe(false)
      expect(result.errors!.length).toBe(1)
    })
  })
})
