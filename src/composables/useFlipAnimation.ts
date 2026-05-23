import { nextTick } from 'vue'

const FLIP_DURATION = 300
const SORTABLE_ANIMATION = 200

export function useFlipAnimation(containerRef: () => HTMLElement | undefined, itemSelector: string) {
  const positions = new Map<string, DOMRect>()

  const recordPositions = () => {
    const container = containerRef()
    if (!container) return
    container.querySelectorAll(itemSelector).forEach((el) => {
      const id = (el as HTMLElement).dataset.flipId
      if (id) positions.set(id, el.getBoundingClientRect())
    })
  }

  const animateFlip = async () => {
    // Wait for SortableJS's built-in animation to finish before measuring final positions
    await new Promise(r => setTimeout(r, SORTABLE_ANIMATION))
    await nextTick()

    const container = containerRef()
    if (!container) return

    const elements = container.querySelectorAll(itemSelector)
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement
      const id = htmlEl.dataset.flipId
      if (!id) return
      const oldRect = positions.get(id)
      if (!oldRect) return

      const newRect = htmlEl.getBoundingClientRect()
      const dx = oldRect.left - newRect.left
      const dy = oldRect.top - newRect.top
      if (dx === 0 && dy === 0) return

      htmlEl.style.transition = 'none'
      htmlEl.style.transform = `translate(${dx}px, ${dy}px)`

      requestAnimationFrame(() => {
        htmlEl.style.transition = `transform ${FLIP_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`
        htmlEl.style.transform = ''

        const cleanup = () => {
          htmlEl.style.transition = ''
          htmlEl.removeEventListener('transitionend', onEnd)
          clearTimeout(fallback)
        }
        const onEnd = () => cleanup()
        // Fallback cleanup in case transitionend doesn't fire
        const fallback = setTimeout(cleanup, FLIP_DURATION + 50)
        htmlEl.addEventListener('transitionend', onEnd)
      })
    })

    positions.clear()
  }

  return { recordPositions, animateFlip }
}