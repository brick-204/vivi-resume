import type { GlobalThemeOverrides } from 'naive-ui'
import { darkTheme } from 'naive-ui'
import { createDiscreteApi } from 'naive-ui'

// 可爱风主题覆盖
export const themeOverrides: GlobalThemeOverrides = {
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
    // 深色背景适配
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

export const naiveDarkTheme = darkTheme

// 独立 API（不需要 provider 包裹即可使用 message/notification/dialog）
const { message, notification, dialog } = createDiscreteApi(
  ['message', 'dialog', 'notification'],
  {
    configProviderProps: {
      theme: darkTheme,
      themeOverrides,
    },
  }
)

export { message, notification, dialog }
