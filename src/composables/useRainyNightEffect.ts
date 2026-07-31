import { readonly } from 'vue'
import {
  active,
  showLightRainEffect,
  hideLightRainEffect,
  isLightRainEffectActive,
  showRainyNightEffect,
  hideRainyNightEffect,
  isRainyNightEffectActive,
} from '@/services/rainyNightEffect'

/**
 * 小雨彩蛋 composable。
 * 多组件共享同一全局实例状态（service 层 shallowRef），不各自创建独立状态。
 */
export function useLightRainEffect() {
  return {
    show: showLightRainEffect,
    hide: hideLightRainEffect,
    isActive: readonly(active),
    isActiveFn: isLightRainEffectActive,
  }
}

/** 旧名别名（兼容现有引用，语义已改为小雨） */
export const useRainyNightEffect = useLightRainEffect

// ponytail: 兼容具名导出，便于既有 import { showRainyNightEffect } 调用
export {
  showRainyNightEffect,
  hideRainyNightEffect,
  isRainyNightEffectActive,
}
