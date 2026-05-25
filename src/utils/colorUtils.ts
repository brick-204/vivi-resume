// 颜色推导工具 — 从主题色衍生出各类相关颜色

export interface ParsedColor {
  r: number
  g: number
  b: number
  a: number
}

export function parseAccentColor(color: string): ParsedColor | null {
  if (!color) return null
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return { r: +rgbaMatch[1], g: +rgbaMatch[2], b: +rgbaMatch[3], a: rgbaMatch[4] !== undefined ? +rgbaMatch[4] : 1 }
  }
  const hex = hexToRgb(color)
  if (hex) return { r: hex[0], g: hex[1], b: hex[2], a: 1 }
  return null
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const n = parseInt(clean, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const r2 = r / 255, g2 = g / 255, b2 = b / 255
  const max = Math.max(r2, g2, b2), min = Math.min(r2, g2, b2)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r2) h = 60 * (((g2 - b2) / d) % 6)
    else if (max === g2) h = 60 * ((b2 - r2) / d + 2)
    else h = 60 * ((r2 - g2) / d + 4)
    if (h < 0) h += 360
  }
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
}

// 模块标题色 — 暗化到低明度、保持色调，保证可读
export function deriveSectionTitleColor(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return '#1a1a2e'
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const derived = hslToRgb(hsl.h, Math.max(hsl.s, 0.4), 0.20)
  return rgba(derived.r, derived.g, derived.b, 1)
}

// 标签背景 — 主题色极淡底色
export function deriveTagBg(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return 'rgba(124, 92, 252, 0.08)'
  return rgba(parsed.r, parsed.g, parsed.b, 0.08)
}

// 标签文字色 — 主题色略暗化，全不透明
export function deriveTagColor(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return '#0891b2'
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const derived = hslToRgb(hsl.h, hsl.s, Math.max(hsl.l - 0.08, 0.2))
  return rgba(derived.r, derived.g, derived.b, 1)
}

// 标签边框色 — 主题色淡边框
export function deriveTagBorder(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return 'rgba(124, 92, 252, 0.15)'
  return rgba(parsed.r, parsed.g, parsed.b, 0.15)
}

// 装饰线色 — 分隔线/时间线等极淡主题色
export function deriveDecorativeLine(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return '#e8e8f0'
  return rgba(parsed.r, parsed.g, parsed.b, 0.12)
}

// 日期背景色
export function deriveEntryDateBg(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return 'rgba(124, 92, 252, 0.08)'
  return rgba(parsed.r, parsed.g, parsed.b, 0.08)
}

// 日期边框色
export function deriveEntryDateBorder(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return 'rgba(124, 92, 252, 0.15)'
  return rgba(parsed.r, parsed.g, parsed.b, 0.15)
}

// 侧边栏背景渐变 — 从极淡到稍浓的主题色渐变
export function deriveSidebarBg(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)'
  return `linear-gradient(180deg, rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.15) 0%, rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.22) 100%)`
}

// 侧边栏文字色 — 极暗的主题色变体
export function deriveSidebarText(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return '#1e3a5f'
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const derived = hslToRgb(hsl.h, Math.max(hsl.s, 0.5), 0.18)
  return rgba(derived.r, derived.g, derived.b, 1)
}

// 侧边栏职位色 — 中间亮度的去饱和变体
export function deriveSidebarTitleColor(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return '#3b6ba5'
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const derived = hslToRgb(hsl.h, hsl.s * 0.7, 0.35)
  return rgba(derived.r, derived.g, derived.b, 1)
}

// 侧边栏字段色 — 中间偏暗的去饱和变体
export function deriveSidebarFieldColor(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return '#2d5a8e'
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const derived = hslToRgb(hsl.h, hsl.s * 0.8, 0.30)
  return rgba(derived.r, derived.g, derived.b, 1)
}

// 头部背景色 — 主题色的深色饱和变体，保证白色文字可读
export function deriveHeaderBg(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return '#06b6d4'
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const l = Math.min(Math.max(hsl.l, 0.30), 0.45)
  const s = Math.max(hsl.s, 0.55)
  const derived = hslToRgb(hsl.h, s, l)
  return rgba(derived.r, derived.g, derived.b, 1)
}

// 侧边栏高亮圆点色 — 亮色的去饱和变体
export function deriveSidebarHighlightDot(accent: string): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return '#93c5fd'
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const derived = hslToRgb(hsl.h, hsl.s * 0.6, 0.70)
  return rgba(derived.r, derived.g, derived.b, 1)
}