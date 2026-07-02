import { useResumeStore } from '@/stores/resumeStore'
import { getSectionTitle } from '@/types/resume'

export function useSectionTitle() {
  const store = useResumeStore()

  const saveTitle = (event: FocusEvent, sectionId: string) => {
    const text = (event.target as HTMLElement).textContent?.trim() || ''
    const titles = { ...store.currentResume?.sectionTitles }
    // ponytail: 只有清空才删除（回退到默认标题）；内容未变时不写，避免无谓 dirty
    if (!text) {
      delete titles[sectionId]
    } else if (text !== getSectionTitle(store.currentResume, sectionId)) {
      titles[sectionId] = text
    }
    store.updateCurrentResume({ sectionTitles: titles })
  }

  return { saveTitle, getSectionTitle }
}
