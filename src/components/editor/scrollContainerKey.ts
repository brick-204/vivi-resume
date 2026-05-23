import type { InjectionKey, Ref } from 'vue'

export const ScrollContainerKey: InjectionKey<Ref<HTMLElement | undefined>> = Symbol('editor-scroll-container')
