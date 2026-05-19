import { useResumeStore } from '@/stores/resumeStore'
import { getSectionTitle } from '@/types/resume'

export function useSectionTitle() {
  const store = useResumeStore()

  const saveTitle = (event: FocusEvent, sectionId: string) => {
    const text = (event.target as HTMLElement).textContent?.trim() || ''
    const titles = { ...store.currentResume?.sectionTitles }
    if (text && text !== getSectionTitle(store.currentResume, sectionId)) {
      titles[sectionId] = text
    } else {
      delete titles[sectionId]
    }
    store.updateCurrentResume({ sectionTitles: titles })
  }

  return { saveTitle, getSectionTitle }
}
