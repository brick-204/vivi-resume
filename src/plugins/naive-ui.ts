import type { GlobalThemeOverrides } from 'naive-ui'
import { darkTheme } from 'naive-ui'
import { createDiscreteApi } from 'naive-ui'

// ==================== 深色主题覆盖 ====================
export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#7b93f8',
    primaryColorHover: '#9baff9',
    primaryColorPressed: '#5a73d6',
    primaryColorSuppl: '#6b83f0',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: '14px',
    fontSizeSmall: '12px',
    fontSizeMini: '11px',
    heightMedium: '36px',
    heightSmall: '30px',
    heightMini: '24px',
    bodyColor: '#1a1a1a',
    cardColor: '#2a2a2a',
    modalColor: '#1e1e1e',
    popoverColor: '#2a2a2a',
    inputColor: '#2a2a2a',
    actionColor: '#2a2a2a',
    tableColor: '#1a1a1a',
    textColor1: '#ececec',
    textColor2: '#9a9a9a',
    textColor3: '#636363',
    dividerColor: '#333333',
    borderColor: '#333333',
    hoverColor: '#333333',
    placeholderColor: '#636363',
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusSmall: '6px',
    borderRadiusTiny: '4px',
    fontSizeMedium: '14px',
    fontSizeSmall: '13px',
    fontWeightStrong: '600',
    heightMedium: '36px',
    heightSmall: '30px',
  },
  Input: {
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    borderFocus: '1px solid #7b93f8',
    borderHover: '1px solid rgba(123, 147, 248, 0.5)',
    boxShadowFocus: '0 0 0 2px rgba(79, 109, 245, 0.15)',
    caretColor: '#7b93f8',
  },
  Card: {
    borderRadius: '12px',
  },
  Modal: {
    borderRadius: '12px',
  },
  Switch: {
    borderRadius: '8px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '8px',
      },
    },
  },
  Slider: {
    fillColor: '#4f6df5',
    fillColorHover: '#7b93f8',
    dotColor: '#4f6df5',
    dotBorderActive: '2px solid #7b93f8',
  },
  Popconfirm: {
    borderRadius: '8px',
  },
  ColorPicker: {
    borderRadius: '8px',
  },
  InputNumber: {
    borderRadius: '8px',
  },
  Message: {
    borderRadius: '8px',
  },
}

// ==================== 浅色主题覆盖 ====================
export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#4f6df5',
    primaryColorHover: '#7b93f8',
    primaryColorPressed: '#3b52c7',
    primaryColorSuppl: '#5a73d6',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: '14px',
    fontSizeSmall: '12px',
    fontSizeMini: '11px',
    heightMedium: '36px',
    heightSmall: '30px',
    heightMini: '24px',
    bodyColor: '#f8f9fa',
    cardColor: '#ffffff',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    inputColor: '#ffffff',
    actionColor: '#f0f1f3',
    tableColor: '#f8f9fa',
    textColor1: '#1c1917',
    textColor2: '#5f6368',
    textColor3: '#9aa0a6',
    dividerColor: '#e0e0e0',
    borderColor: '#e0e0e0',
    hoverColor: '#e8eaed',
    placeholderColor: '#9aa0a6',
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusSmall: '6px',
    borderRadiusTiny: '4px',
    fontSizeMedium: '14px',
    fontSizeSmall: '13px',
    fontWeightStrong: '600',
    heightMedium: '36px',
    heightSmall: '30px',
  },
  Input: {
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    borderFocus: '1px solid #4f6df5',
    borderHover: '1px solid rgba(79, 109, 245, 0.4)',
    boxShadowFocus: '0 0 0 2px rgba(79, 109, 245, 0.12)',
    caretColor: '#4f6df5',
  },
  Card: {
    borderRadius: '12px',
  },
  Modal: {
    borderRadius: '12px',
  },
  Switch: {
    borderRadius: '8px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '8px',
      },
    },
  },
  Slider: {
    fillColor: '#4f6df5',
    fillColorHover: '#7b93f8',
    dotColor: '#4f6df5',
    dotBorderActive: '2px solid #7b93f8',
  },
  Popconfirm: {
    borderRadius: '8px',
  },
  ColorPicker: {
    borderRadius: '8px',
  },
  InputNumber: {
    borderRadius: '8px',
  },
  Message: {
    borderRadius: '8px',
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
