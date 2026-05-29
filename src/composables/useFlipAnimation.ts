import { nextTick } from 'vue'

const FLIP_DURATION = 300
const LAYOUT_FLIP_DURATION = 350
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

  const runFlip = (duration: number) => {
    const container = containerRef()
    if (!container) return

    container.querySelectorAll(itemSelector).forEach((el) => {
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
        htmlEl.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`
        htmlEl.style.transform = ''

        const cleanup = () => {
          htmlEl.style.transition = ''
          htmlEl.style.transform = ''
          htmlEl.removeEventListener('transitionend', onEnd)
          clearTimeout(fallback)
        }
        const onEnd = () => cleanup()
        const fallback = setTimeout(cleanup, duration + 50)
        htmlEl.addEventListener('transitionend', onEnd)
      })
    })

    positions.clear()
  }

  const animateFlip = async () => {
    await new Promise(r => setTimeout(r, SORTABLE_ANIMATION))
    await nextTick()
    runFlip(FLIP_DURATION)
  }

  const animateLayoutChange = () => {
    runFlip(LAYOUT_FLIP_DURATION)
  }

  return { recordPositions, animateFlip, animateLayoutChange }
}
