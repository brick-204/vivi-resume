const { getIconData } = require('@iconify/utils')
const fs = require('fs')
const path = require('path')

const ICON_PATTERN = /mdi:([a-z0-9-]+)/g

function walkDir(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'generated') continue
    const stat = fs.statSync(full)
    if (stat.isDirectory()) results.push(...walkDir(full))
    else if (/\.(vue|ts|tsx|js|jsx)$/.test(entry)) results.push(full)
  }
  return results
}

function scanIcons(srcDir) {
  const icons = new Set()
  for (const file of walkDir(srcDir)) {
    const code = fs.readFileSync(file, 'utf-8')
    let match
    while ((match = ICON_PATTERN.exec(code)) !== null) {
      icons.add(match[1])
    }
  }
  return icons
}

function main() {
  const srcDir = path.resolve(__dirname, '../src')
  const icons = scanIcons(srcDir)

  const mdi = require('@iconify-json/mdi').icons

  const iconData = {}
  for (const name of icons) {
    const data = getIconData(mdi, name)
    if (data) iconData[name] = data
    else console.warn(`Icon not found: mdi:${name}`)
  }

  const output = `// Auto-generated — regenerate with: pnpm generate-icons
import { addCollection } from '@iconify/vue'

addCollection({
  prefix: 'mdi',
  icons: ${JSON.stringify(iconData)},
  width: 24,
  height: 24,
})
`

  const outDir = path.join(srcDir, 'generated')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'icon-bundle.ts'), output)

  console.log(`Bundled ${Object.keys(iconData).length} icons → src/generated/icon-bundle.ts`)
}

main()