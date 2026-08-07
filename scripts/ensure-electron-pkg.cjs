// 确保 dist-electron/package.json 声明 type:commonjs
// 主进程 tsc 编译产物是 CJS，但项目根 package.json 是 type:module，
// 需在 dist-electron 下覆盖为 commonjs，否则 Electron 以 ESM 加载 CJS 产物报错。
const fs = require('fs')
const path = require('path')

const dir = path.resolve(__dirname, '..', 'dist-electron')
const file = path.join(dir, 'package.json')

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}
fs.writeFileSync(file, JSON.stringify({ type: 'commonjs' }, null, 2) + '\n')
console.log('[ensure-electron-pkg] wrote', file)
