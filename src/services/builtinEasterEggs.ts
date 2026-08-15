/**
 * 内置彩蛋注册：import 本模块即触发注册（模块顶层副作用）。
 * main.ts 初始化时 import 一次即可，后续新增彩蛋在此处加一行 registerEasterEgg。
 */
import { showLightRainEffect } from '@/services/rainyNightEffect'
import { showSnowEffect } from '@/services/snowEffect'
import { showOfferEffect } from '@/services/offerEffect'
import { showEnvelopeEffect } from '@/services/envelopeEffect'
import { registerEasterEgg, type TriggerOpts } from '@/services/easterEggRegistry'

registerEasterEgg({
  id: 'rainy-night',
  trigger: (opts?: TriggerOpts) => showLightRainEffect(undefined, opts?.bypassLock),
  quoteCategory: 'rainy',
})

registerEasterEgg({
  id: 'snow',
  trigger: (opts?: TriggerOpts) => showSnowEffect(undefined, opts?.bypassLock),
  quoteCategory: 'snowy',
})

registerEasterEgg({
  id: 'offer',
  trigger: (opts?: TriggerOpts) => showOfferEffect(undefined, opts?.bypassLock),
  quoteCategory: 'offer',
  // showOfferEffect 内部已调 sayCategory（与快捷键 onMatch 路径一致），防止重复
  internalSay: true,
})

registerEasterEgg({
  id: 'envelope',
  trigger: (opts?: TriggerOpts) => showEnvelopeEffect(undefined, opts?.bypassLock),
  // 信封话术带 firstname/company 变量，由 showEnvelopeEffect 内部调 sayCategory，
  // internalSay=true 防止桌宠随机触发后再重复 sayCategory（无变量）
  quoteCategory: 'envelope',
  internalSay: true,
})
