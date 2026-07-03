import { ref, onUnmounted } from 'vue'

/**
 * 视口内懒加载 composable
 * @param options.root 元素 Mount 后立即观察的父元素（可选）
 * @param options.threshold 进入多少比例触发（默认 0.01）
 * @param options.rootMargin 提前预加载的视口边缘距离（如 '200px' 表示提前 200px 触发）
 */
export function useInView(
  options: {
    root?: HTMLElement | null
    threshold?: number
    rootMargin?: string
  } = {}
) {
  const isVisible = ref(false)

  let observer: IntersectionObserver | null = null

  // ponytail: 视口外不渲染重内容，进入视口后一次性触发并断开
  const setupObserver = (target: HTMLElement) => {
    if (observer) {
      observer.observe(target)
      return
    }

    observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          isVisible.value = true
          observer?.disconnect()
        }
      },
      {
        threshold: options.threshold ?? 0.01,
        rootMargin: options.rootMargin ?? '200px',
        root: options.root ?? undefined,
      }
    )

    observer.observe(target)
  }

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return { isVisible, setupObserver }
}
