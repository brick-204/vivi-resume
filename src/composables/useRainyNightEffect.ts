import { readonly } from 'vue'
import {
  active,
  showRainyNightEffect,
  hideRainyNightEffect,
} from '@/services/rainyNightEffect'

/**
 * 雨夜窗景彩蛋 composable。
 * 多组件共享同一全局实例状态（service 层 shallowRef），不各自创建独立状态。
 */
export function useRainyNightEffect() {
  return {
    show: showRainyNightEffect,
    hide: hideRainyNightEffect,
    isActive: readonly(active),
  }
}
