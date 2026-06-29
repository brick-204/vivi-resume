// 验证 docx 库的 TextRun border/shading 行为 + 颜色计算
import { Document, Packer, Paragraph, TextRun, BorderStyle, ShadingType, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'
import { writeFileSync } from 'fs'
import { execSync } from 'child_process'

// 复制 colorUtils 的 parseAccentColor
function parseAccentColor(color) {
  if (!color) return null
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) return { r: +rgbaMatch[1], g: +rgbaMatch[2], b: +rgbaMatch[3], a: rgbaMatch[4] !== undefined ? +rgbaMatch[4] : 1 }
  const clean = color.replace('#', '')
  if (clean.length !== 6) return null
  const n = parseInt(clean, 16)
  return isNaN(n) ? null : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
}

function rgbaTintToHex(color) {
  const p = parseAccentColor(color)
  if (!p) return undefined
  const a = p.a ?? 1
  if (a >= 1) return hex(p.r, p.g, p.b)
  const r = Math.round(p.r * a + 255 * (1 - a))
  const g = Math.round(p.g * a + 255 * (1 - a))
  const b = Math.round(p.b * a + 255 * (1 - a))
  return hex(r, g, b)
}
function hex(r, g, b) {
  return `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
function deriveTagBorder(accent) {
  const p = parseAccentColor(accent)
  if (!p) return 'rgba(124, 92, 252, 0.15)'
  return `rgba(${p.r}, ${p.g}, ${p.b}, 0.15)`
}
function deriveTagBg(accent) {
  const p = parseAccentColor(accent)
  if (!p) return 'rgba(124, 92, 252, 0.08)'
  return `rgba(${p.r}, ${p.g}, ${p.b}, 0.08)`
}

const accent = '#3b82f6' // sidebar 默认蓝
console.log('=== 颜色计算验证 (accent=' + accent + ') ===')
console.log('tagBorder(0.15 alpha 合成白底):', rgbaTintToHex(deriveTagBorder(accent)))
console.log('tagBg(0.08 alpha 合成白底):', rgbaTintToHex(deriveTagBg(accent)))

// 方式 A: TextRun + border + shading（当前实现）
const textRunTag = new Paragraph({
  children: [new TextRun({
    text: ' Vue ',
    size: 20,
    color: '1d4ed8',
    shading: { type: ShadingType.SOLID, color: 'dbeafe', fill: 'dbeafe' },
    border: { style: BorderStyle.SINGLE, size: 1, color: '93c5fd' },
  })],
  spacing: { before: 60, after: 60 },
})

// 方式 B: 表格单元格实现（每个标签一个带边框的单元格）
const cellTag = (text, bg, border, color) => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text: ` ${text} `, size: 20, color })] })],
  shading: { type: ShadingType.SOLID, color: bg, fill: bg },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: border },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: border },
    left: { style: BorderStyle.SINGLE, size: 4, color: border },
    right: { style: BorderStyle.SINGLE, size: 4, color: border },
  },
  margins: { top: 20, bottom: 20, left: 40, right: 40 },
})

const tableTags = new Table({
  rows: [new TableRow({
    children: [
      cellTag('Vue', 'dbeafe', '93c5fd', '1d4ed8'),
      cellTag('React', 'dbeafe', '93c5fd', '1d4ed8'),
      cellTag('TypeScript', 'dbeafe', '93c5fd', '1d4ed8'),
    ],
  })],
  width: { size: 100, type: WidthType.PERCENTAGE },
})

const doc = new Document({
  sections: [{
    children: [
      new Paragraph({ children: [new TextRun({ text: '方式A: TextRun border（当前实现）', bold: true })] }),
      textRunTag,
      new Paragraph({ children: [new TextRun({ text: '方式B: 表格单元格（备选）', bold: true })], spacing: { before: 200 } }),
      tableTags,
    ],
  }],
})

const buf = await Packer.toBuffer(doc)
const outPath = 'd:/tmp/test-tags.docx'
writeFileSync(outPath, buf)
console.log('\n已生成:', outPath)

// 解压看 XML
execSync(`powershell -Command "Expand-Archive -Path '${outPath}' -DestinationPath 'd:/tmp/test-tags-xml' -Force" 2>$null`)
const { readFileSync } = await import('fs')
const xml = readFileSync('d:/tmp/test-tags-xml/word/document.xml', 'utf8')
console.log('\n=== document.xml (格式化关键片段) ===')
// 打印 w:bdr 和 w:shd 相关
const bdrMatches = xml.match(/<w:bdr[^>]*>/g) || []
console.log('TextRun border (w:bdr) 数量:', bdrMatches.length)
bdrMatches.forEach(m => console.log('  ', m))
const shdMatches = xml.match(/<w:shd[^>]*>/g) || []
console.log('shading (w:shd) 数量:', shdMatches.length)
shdMatches.slice(0, 4).forEach(m => console.log('  ', m))
