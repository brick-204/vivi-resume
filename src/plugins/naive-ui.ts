import type { GlobalThemeOverrides } from 'naive-ui'
import { darkTheme } from 'naive-ui'
import { createDiscreteApi } from 'naive-ui'

// ==================== 深色主题覆盖 ====================
export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#a78bfa',
    primaryColorHover: '#c4b5fd',
    primaryColorPressed: '#8b6ff0',
    primaryColorSuppl: '#b9a0fc',
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: '14px',
    fontSizeSmall: '12px',
    fontSizeMini: '11px',
    heightMedium: '36px',
    heightSmall: '30px',
    heightMini: '24px',
    bodyColor: '#0f0f23',
    cardColor: 'rgba(255, 255, 255, 0.05)',
    modalColor: '#1a1a3e',
    popoverColor: '#1a1a3e',
    inputColor: 'rgba(255, 255, 255, 0.06)',
    actionColor: 'rgba(255, 255, 255, 0.06)',
    tableColor: '#0f0f23',
    textColor1: '#e8e8f0',
    textColor2: '#9898b8',
    textColor3: '#5a5a7a',
    dividerColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    hoverColor: 'rgba(255, 255, 255, 0.08)',
    placeholderColor: '#5a5a7a',
  },
  Button: {
    borderRadiusMedium: '20px',
    borderRadiusSmall: '16px',
    borderRadiusTiny: '12px',
    fontSizeMedium: '14px',
    fontSizeSmall: '13px',
    fontWeightStrong: '600',
    heightMedium: '36px',
    heightSmall: '30px',
  },
  Input: {
    borderRadius: '12px',
    borderRadiusSmall: '10px',
    borderFocus: '1px solid #a78bfa',
    borderHover: '1px solid rgba(167, 139, 250, 0.5)',
    boxShadowFocus: '0 0 0 2px rgba(167, 139, 250, 0.2)',
    caretColor: '#a78bfa',
  },
  Card: {
    borderRadius: '16px',
  },
  Modal: {
    borderRadius: '20px',
  },
  Switch: {
    borderRadius: '10px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '10px',
      },
    },
  },
  Slider: {
    fillColor: '#a78bfa',
    fillColorHover: '#c4b5fd',
    dotColor: '#a78bfa',
    dotBorderActive: '2px solid #c4b5fd',
  },
  Popconfirm: {
    borderRadius: '12px',
  },
  ColorPicker: {
    borderRadius: '12px',
  },
  InputNumber: {
    borderRadius: '10px',
  },
  Message: {
    borderRadius: '12px',
  },
}

// ==================== 浅色主题覆盖 ====================
export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#7c5cfc',
    primaryColorHover: '#a78bfa',
    primaryColorPressed: '#5b3fd4',
    primaryColorSuppl: '#8b6ff0',
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: '14px',
    fontSizeSmall: '12px',
    fontSizeMini: '11px',
    heightMedium: '36px',
    heightSmall: '30px',
    heightMini: '24px',
    bodyColor: '#f8f9fc',
    cardColor: '#ffffff',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    inputColor: '#ffffff',
    actionColor: '#f0f1f5',
    tableColor: '#f8f9fc',
    textColor1: '#1c1917',
    textColor2: '#5a5a7a',
    textColor3: '#9898b8',
    dividerColor: 'rgba(0, 0, 0, 0.08)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    hoverColor: 'rgba(0, 0, 0, 0.04)',
    placeholderColor: '#9898b8',
  },
  Button: {
    borderRadiusMedium: '20px',
    borderRadiusSmall: '16px',
    borderRadiusTiny: '12px',
    fontSizeMedium: '14px',
    fontSizeSmall: '13px',
    fontWeightStrong: '600',
    heightMedium: '36px',
    heightSmall: '30px',
  },
  Input: {
    borderRadius: '12px',
    borderRadiusSmall: '10px',
    borderFocus: '1px solid #7c5cfc',
    borderHover: '1px solid rgba(124, 92, 252, 0.4)',
    boxShadowFocus: '0 0 0 2px rgba(124, 92, 252, 0.15)',
    caretColor: '#7c5cfc',
  },
  Card: {
    borderRadius: '16px',
  },
  Modal: {
    borderRadius: '20px',
  },
  Switch: {
    borderRadius: '10px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '10px',
      },
    },
  },
  Slider: {
    fillColor: '#7c5cfc',
    fillColorHover: '#a78bfa',
    dotColor: '#7c5cfc',
    dotBorderActive: '2px solid #a78bfa',
  },
  Popconfirm: {
    borderRadius: '12px',
  },
  ColorPicker: {
    borderRadius: '12px',
  },
  InputNumber: {
    borderRadius: '10px',
  },
  Message: {
    borderRadius: '12px',
  },
}

// ==================== 向后兼容导出 ====================
export const themeOverrides = darkThemeOverrides
export const naiveDarkTheme = darkTheme

// ==================== 响应式主题获取 ====================
export function getNaiveTheme(resolvedTheme: 'light' | 'dark') {
  return resolvedTheme === 'dark' ? darkTheme : null
}

export function getNaiveThemeOverrides(resolvedTheme: 'light' | 'dark'): GlobalThemeOverrides {
  return resolvedTheme === 'dark' ? darkThemeOverrides : lightThemeOverrides
}

// ==================== 离散 API ====================
// 离散 API 的 configProviderProps 不支持响应式更新
// 通过 ref 包装导出，在 useTheme 中切换主题时重新赋值
import { ref } from 'vue'

const _discreteApi = ref(createDiscreteApi(
  ['message', 'dialog', 'notification'],
  {
    configProviderProps: {
      theme: darkTheme,
      themeOverrides: darkThemeOverrides,
    },
  }
))

export const message = _discreteApi.value.message
export const notification = _discreteApi.value.notification
export const dialog = _discreteApi.value.dialog

/**
 * 重建离散 API 实例以切换主题
 */
export function rebuildDiscreteApi(resolvedTheme: 'light' | 'dark') {
  const api = createDiscreteApi(
    ['message', 'dialog', 'notification'],
    {
      configProviderProps: {
        theme: getNaiveTheme(resolvedTheme),
        themeOverrides: getNaiveThemeOverrides(resolvedTheme),
      },
    }
  )
  // 替换导出的实例属性
  Object.assign(message, api.message)
  Object.assign(notification, api.notification)
  Object.assign(dialog, api.dialog)
}
