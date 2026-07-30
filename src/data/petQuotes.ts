/**
 * 桌宠话术库
 *
 * 按场景分类，pickQuote(category) 随机取一条。
 * 操作触发场景（save/export/aiError/enterEditor）由各业务点调用 say()；
 * idle/greet/hover 由桌宠组件自身触发。
 */

const quotes = {
  /** 进页面/切路由时的招呼 */
  greet: [
    'v仔来啦！今天改点啥？',
    '嗨，v仔又见面啦～',
    'v仔盯你好久了，快开始吧',
    'v仔准备好开工了，你呢？',
  ],
  /** 定时随机冒泡（卖萌/闲话） */
  idle: [
    '戳我可以问我问题哦～',
    '简历写累了就歇会儿吧',
    '记得随时保存呀…虽然v仔会帮你自动存',
    '要不要v仔帮你润色一下这段？',
    '你的简历越来越棒了！v仔认证',
    '咦，这个经历写得不错嘛',
    'v仔在这儿呢，有事叫我',
  ],
  /** 鼠标悬停桌宠时 */
  hover: [
    '哎呀，痒～',
    '点我点我！',
    '想聊什么？',
    '嘿嘿，被发现了',
  ],
  /** 简历保存成功 */
  save: [
    '存好啦！放心',
    '已自动保存，稳得很',
    '保存成功～继续加油',
  ],
  /** 导出成功（PDF/图片/JSON 通用） */
  export: [
    '导出完成！快去投简历吧',
    '搞定！祝你好运～',
    '导出成功，冲冲冲',
  ],
  /** AI 调用失败 */
  aiError: [
    'AI 开小差了，稍后再试试',
    '呜，连接出了点问题…',
    'AI 罢工了，检查下配置？',
  ],
  /** 进入编辑器 */
  enterEditor: [
    '开整！先从哪块下手？',
    '编辑模式启动～',
    '让我看看这份简历',
  ],
} as const

export type QuoteCategory = keyof typeof quotes

/** 随机取某分类的一条话术；分类为空则回退到 idle */
export const pickQuote = (category: QuoteCategory): string => {
  const list = quotes[category] ?? quotes.idle
  return list[Math.floor(Math.random() * list.length)]
}
