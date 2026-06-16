import { computed } from 'vue'
import type { Ref } from 'vue'
import type { Resume } from '@/types/resume'
import { serializeResumeForSearch } from '@/services/resumeSerializer'

/**
 * 全文搜索 composable
 * 搜索简历标题和内容，支持缓存避免重复序列化
 */
export function useResumeSearch(resumeList: Ref<Resume[]>, query: Ref<string>) {
  // 缓存：以 resume.id + updatedAt 为 key，避免重复序列化
  const searchCache = new Map<string, { text: string; updatedAt: string }>()

  const getSearchText = (resume: Resume): string => {
    const cached = searchCache.get(resume.id)
    if (cached && cached.updatedAt === resume.updatedAt) return cached.text
    const text = serializeResumeForSearch(resume)
    searchCache.set(resume.id, { text, updatedAt: resume.updatedAt || '' })
    return text
  }

  const filteredResumes = computed(() => {
    if (!query.value.trim()) return resumeList.value
    const q = query.value.trim().toLowerCase()
    return resumeList.value.filter(r => {
      // 先匹配标题
      if (r.title.toLowerCase().includes(q)) return true
      // 再匹配内容
      return getSearchText(r).toLowerCase().includes(q)
    })
  })

  return { filteredResumes }
}
