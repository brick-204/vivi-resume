/**
 * 内置彩蛋注册：import 本模块即触发注册（模块顶层副作用）。
 * main.ts 初始化时 import 一次即可，后续新增彩蛋在此处加一行 registerEasterEgg。
 */
import { showLightRainEffect } from '@/services/rainyNightEffect'
import { showSnowEffect } from '@/services/snowEffect'
import { showOfferEffect } from '@/services/offerEffect'
import { registerEasterEgg } from '@/services/easterEggRegistry'

registerEasterEgg({
  id: 'rainy-night',
  trigger: () => showLightRainEffect(),
  quoteCategory: 'rainy',
})

registerEasterEgg({
  id: 'snow',
  trigger: () => showSnowEffect(),
  quoteCategory: 'snowy',
})

registerEasterEgg({
  id: 'offer',
  trigger: () => showOfferEffect(),
  quoteCategory: 'offer',
})
