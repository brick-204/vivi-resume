import { computed, ref } from 'vue'

const activeRequests = ref(0)

/** True while any app-level streamed AI request is in flight. */
export const isAIThinking = computed(() => activeRequests.value > 0)

/** Count a streamed AI request until its caller finishes, including errors and aborts. */
export function beginAIRequest(): () => void {
  activeRequests.value += 1
  let finished = false
  return () => {
    if (!finished) activeRequests.value = Math.max(0, activeRequests.value - 1)
    finished = true
  }
}
