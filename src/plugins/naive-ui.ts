import type { GlobalThemeOverrides } from 'naive-ui'
import { darkTheme } from 'naive-ui'
import { createDiscreteApi } from 'naive-ui'

// ==================== Apple 风格 - 深色主题覆盖 ====================
export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0066cc',             // Action Blue
    primaryColorHover: '#0071e1',
    primaryColorPressed: '#005bb5',
    primaryColorSuppl: '#0071e1',
    borderRadius: '18px',                // Apple lg radius
    borderRadiusSmall: '11px',           // Apple md radius
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: '17px',                    // Apple body size
    fontSizeSmall: '14px',
    fontSizeMini: '12px',
    heightMedium: '40px',
    heightSmall: '32px',
    heightMini: '24px',
    bodyColor: '#272729',                // Near-Black Tile 1
    cardColor: '#2a2a2c',                // Near-Black Tile 2
    modalColor: '#252527',               // Near-Black Tile 3
    popoverColor: '#2a2a2c',
    inputColor: '#2a2a2c',
    actionColor: '#2a2a2c',
    tableColor: '#272729',
    textColor1: '#f5f5f7',               // Parchment
    textColor2: '#a1a1a6',               // Secondary gray
    textColor3: '#6e6e73',               // Tertiary gray
    dividerColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    hoverColor: 'rgba(255, 255, 255, 0.06)',
    placeholderColor: '#6e6e73',
  },
  Button: {
    borderRadiusMedium: '9999px',        // Pill
    borderRadiusSmall: '11px',
    borderRadiusTiny: '8px',
    fontSizeMedium: '17px',
    fontSizeSmall: '14px',
    fontWeightStrong: '600',
    heightMedium: '40px',
    heightSmall: '32px',
  },
  Input: {
    borderRadius: '11px',
    borderRadiusSmall: '11px',
    color: '#2a2a2c',                  // 输入框背景
    textColor: '#f5f5f7',              // 文本颜色
    placeholderColor: '#86868b',       // 占位符颜色
    borderFocus: '1px solid #0066cc',
    borderHover: '1px solid rgba(0, 102, 204, 0.5)',
    caretColor: '#0066cc',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  Card: {
    borderRadius: '18px',
  },
  Modal: {
    borderRadius: '18px',
  },
  Switch: {
    borderRadius: '11px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '11px',
      },
    },
  },
  Slider: {
    fillColor: '#0066cc',
    fillColorHover: '#0071e1',
    dotColor: '#0066cc',
    dotBorderActive: '2px solid #0071e1',
  },
  Dialog: {
    actionStyle: 'justify-content: center !important;',
  },
  Popconfirm: {
    borderRadius: '18px',
    actionStyle: 'justify-content: center !important;',
    maxWidth: '360px',
  },
  ColorPicker: {
    borderRadius: '11px',
  },
  InputNumber: {
    borderRadius: '11px',
  },
  Message: {
    borderRadius: '11px',
  },
}

// ==================== Apple 风格 - 浅色主题覆盖 ====================
export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0066cc',             // Action Blue
    primaryColorHover: '#0071e1',
    primaryColorPressed: '#005bb5',
    primaryColorSuppl: '#0071e1',
    borderRadius: '18px',                // Apple lg radius
    borderRadiusSmall: '11px',           // Apple md radius
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: '17px',                    // Apple body size
    fontSizeSmall: '14px',
    fontSizeMini: '12px',
    heightMedium: '40px',
    heightSmall: '32px',
    heightMini: '24px',
    bodyColor: '#ffffff',                // Canvas
    cardColor: '#f5f5f7',                // Parchment
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    inputColor: '#ffffff',
    actionColor: '#fafafc',              // Pearl
    tableColor: '#f5f5f7',
    textColor1: '#1d1d1f',               // Near-Black Ink
    textColor2: '#6e6e73',               // Secondary gray
    textColor3: '#86868b',               // Tertiary gray
    dividerColor: 'rgba(0, 0, 0, 0.08)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    hoverColor: 'rgba(0, 0, 0, 0.04)',
    placeholderColor: '#86868b',
  },
  Button: {
    borderRadiusMedium: '9999px',        // Pill
    borderRadiusSmall: '11px',
    borderRadiusTiny: '8px',
    fontSizeMedium: '17px',
    fontSizeSmall: '14px',
    fontWeightStrong: '600',
    heightMedium: '40px',
    heightSmall: '32px',
  },
  Input: {
    borderRadius: '11px',
    borderRadiusSmall: '11px',
    color: '#ffffff',                  // 输入框背景
    textColor: '#1d1d1f',              // 文本颜色
    placeholderColor: '#86868b',       // 占位符颜色
    borderFocus: '1px solid #0066cc',
    borderHover: '1px solid rgba(0, 102, 204, 0.4)',
    caretColor: '#0066cc',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  },
  Card: {
    borderRadius: '18px',
  },
  Modal: {
    borderRadius: '18px',
  },
  Dialog: {
    actionStyle: 'justify-content: center !important;',
  },
  Switch: {
    borderRadius: '11px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '11px',
      },
    },
  },
  Slider: {
    fillColor: '#0066cc',
    fillColorHover: '#0071e1',
    dotColor: '#0066cc',
    dotBorderActive: '2px solid #0071e1',
  },
  Popconfirm: {
    borderRadius: '18px',
    actionStyle: 'justify-content: center !important;',
    maxWidth: '360px',
  },
  ColorPicker: {
    borderRadius: '11px',
  },
  InputNumber: {
    borderRadius: '11px',
  },
  Message: {
    borderRadius: '11px',
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
