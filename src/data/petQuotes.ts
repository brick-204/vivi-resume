/**
 * 桌宠话术库
 *
 * 按场景分类，pickQuote(category) 随机取一条。
 * 操作触发场景（save/export/aiError/enterEditor）由各业务点调用 say()；
 * idle/greet/hover 由桌宠组件自身触发。
 *
 * greet 按系统时段分流（早晨/中午/下午/晚上/深夜），getTimeGreet() 返回当前时段招呼。
 * idle 中简历相关条目仅在编辑器内说（pickIdleQuote(inEditor) 过滤）。
 */

/** 简历相关标记：idle 条目若涉及简历内容，标 true，非编辑器场景过滤掉 */
type IdleQuote = { text: string; resume?: boolean }

const quotes = {
  /** 进页面/切路由时的招呼 —— 按 grep 时段分流，见 timeGreets */
  greet: [
    '{name}来啦！今天改点啥？',
    '嗨，{name}又见面啦～',
    '{name}盯你好久了，快开始吧',
    '{name}准备好开工了，你呢？',
  ],
  /** 定时随机冒泡（卖萌/闲话）；resume:true 仅编辑器内说 */
  idle: [
    { text: '戳我可以问我问题哦～' },
    { text: '简历写累了就歇会儿吧', resume: true },
    { text: '记得随时保存呀…虽然{name}会帮你自动存' },
    { text: '要不要{name}帮你润色一下这段？', resume: true },
    { text: '你的简历越来越棒了！{name}认证', resume: true },
    { text: '咦，这个经历写得不错嘛', resume: true },
    { text: '{name}在这儿呢，有事叫我' },
  ] as IdleQuote[],
  /** 鼠标悬停桌宠时 */
  hover: [
    '哎呀，痒～',
    '点我点我！',
    '想聊什么？',
    '嘿嘿，被发现了',
  ],
  /** 单击桌宠点开 action 列时 */
  click: [
    '嘿，叫我干嘛？',
    '来啦来啦，什么事？',
    '戳我干嘛呀～',
  ],
  /** 进入拖拽时 */
  dragStart: [
    '哎呀，别拽我～',
    '哇——要飞啦！',
    '轻点轻点，晕桌宠',
  ],
  /** 拖拽松手吸附后 */
  dragEnd: [
    '呼，新位置不错',
    '到新家啦，这儿挺好',
    '落地平安，谢谢合作',
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
  /** 连续用眼 25 分钟休息提醒（融合 20-20-20：望 6 米外 20 秒） */
  rest: [
    '看了 25 分钟啦，望 6 米外歇 20 秒～',
    '眼睛该歇歇了！看远处 20 秒再继续',
    '连续用眼太久啦，扭扭脖子望望远吧',
    '休息一下！闭眼 20 秒，让眼睛喘口气',
  ],
  /** 休息提醒开启 */
  restOn: [
    '休息提醒开好啦，{name}会盯着你用眼时间的',
    '收到！{name}到点就叫你休息',
  ],
  /** 休息提醒关闭 */
  restOff: [
    '休息提醒关啦，记得自己按时歇眼睛哦',
    '好叭，{name}不催了，但眼睛累了自己要停',
  ],
  /** AI 动态话术开启（AI 失败时回退） */
  aiChatOn: [
    '好嘞，{name}以后说话更花哨咯',
    'AI 话术开啦，看我花式整活',
  ],
  /** AI 动态话术关闭（AI 失败时回退） */
  aiChatOff: [
    '好吧，那{name}说回老台词啦',
    '关啦，{name}还是原来的配方',
  ],
} as const

export type QuoteCategory = keyof typeof quotes

// ========== 时段招呼 ==========
/** 时段：早晨 05-10 / 中午 11-13 / 下午 14-17 / 晚上 18-22 / 深夜 23-04 */
export type TimePeriod = 'morning' | 'noon' | 'afternoon' | 'evening' | 'lateNight'

const timeGreets: Record<TimePeriod, string[]> = {
  morning: [
    '早安！新的一天，简历搞起来～',
    '早上好呀，今天元气满满',
    '早～趁清醒先把简历改了',
  ],
  noon: [
    '中午啦，吃完饭再来改简历吧',
    '午安，歇会儿再继续～',
  ],
  afternoon: [
    '下午好，进度怎么样啦？',
    '喝杯水继续，{name}陪着你',
  ],
  evening: [
    '晚上好，今晚要冲一波简历吗？',
    '夜里改简历，记得别熬太晚',
  ],
  lateNight: [
    '夜深了…还在肝简历？早点歇吧',
    '这么晚了，{name}心疼你的发际线',
    '深夜修简历，明早起来看会更清醒',
  ],
}

/** 按当前小时返回时段 */
export const getTimePeriod = (hour: number): TimePeriod => {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'lateNight'
}

/** 取当前时段的一条招呼（随机）；name 替换 {name} */
export const getTimeGreet = (name?: string): string => {
  const period = getTimePeriod(new Date().getHours())
  const list = timeGreets[period]
  const raw = list[Math.floor(Math.random() * list.length)]
  return raw.split('{name}').join(name || 'v仔')
}

const fillName = (raw: string, name?: string) => raw.split('{name}').join(name || 'v仔')

/**
 * 随机取某分类的一条话术；分类为空则回退到 idle。
 * name 用于替换占位符 {name}（当前桌宠名字）；缺省回退"v仔"。
 * 注意：idle 分类请用 pickIdleQuote（支持简历话术过滤），此处 idle 取全量。
 */
export const pickQuote = (category: QuoteCategory, name?: string): string => {
  const list = quotes[category] ?? quotes.idle
  // idle 是 IdleQuote[]，其余分类是 string[]
  if (category === 'idle') {
    const raw = (list as IdleQuote[])[Math.floor(Math.random() * list.length)]
    return fillName(raw.text, name)
  }
  const raw = (list as readonly string[])[Math.floor(Math.random() * list.length)]
  return fillName(raw, name)
}

/**
 * 取一条 idle 话术；inEditor=false 时过滤掉简历相关条目（resume:true）。
 * 过滤后若为空（极端情况）回退到第一条非简历条目。
 */
export const pickIdleQuote = (inEditor: boolean, name?: string): string => {
  const filtered = inEditor
    ? quotes.idle
    : quotes.idle.filter(q => !q.resume)
  const list = filtered.length ? filtered : quotes.idle.filter(q => !q.resume)
  const raw = list[Math.floor(Math.random() * list.length)]
  return fillName(raw.text, name)
}
