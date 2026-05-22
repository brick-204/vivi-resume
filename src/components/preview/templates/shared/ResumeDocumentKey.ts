import type { InjectionKey } from 'vue'
import type { useResumeDocument } from './useResumeDocument'

export type ResumeDocumentContext = ReturnType<typeof useResumeDocument>

export const ResumeDocumentKey: InjectionKey<ResumeDocumentContext> = Symbol('resume-document')
