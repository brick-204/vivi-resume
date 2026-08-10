/**
 * 桌宠话术库
 *
 * 按场景分类，pickQuote(category) 随机取一条。
 * 操作触发场景（save/export/aiError/enterEditor/enterHome/切 tab）由各业务点调用 sayCategory()；
 * idle/greet/hover 由桌宠组件自身触发。
 *
 * greet 静态回退为 4 条通用招呼（不分时段）；时段信息仅注入 AI 话术的 period 上下文。
 * idle 中简历相关条目仅在编辑器内说（pickIdleQuote(inEditor) 过滤）。
 */

/** 简历相关标记：idle 条目若涉及简历内容，标 true，非编辑器场景过滤掉 */
type IdleQuote = { text: string; resume?: boolean }

const quotes = {
  /** 进页面/切路由/跨时段的招呼 —— 静态回退按时段分流（greetByPeriod），通用条目兜底 */
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
  /** 开启雨夜窗景彩蛋时 */
  rainy: [
    '下雨啦，听听雨声放松下',
    '雨天适合发呆，{name}陪你',
    '滴答滴答…好惬意的雨夜',
    '窗外淅淅沥沥，正好适合改简历',
    '下雨天，{name}想窝着不动',
  ],
  /** 开启下雪彩蛋时 */
  snowy: [
    '下雪啦，雪花好漂亮～',
    '白茫茫一片，{name}想堆雪人',
    '雪花飘啊飘，安静又温柔',
    '下雪天窝家里改简历，美滋滋',
    '雪好厚呀，{name}踩一脚就是一个印',
  ],
  /** 开启天上掉 offer 彩蛋时 */
  offer: [
    '哇！offer 掉下来啦，快接住！',
    '这么多 offer，{name}都看花眼了',
    '恭喜恭喜！offer 雨露均沾～',
    '接offer接到手软，真不错',
    '天上掉 offer 啦，张开袋子接！',
  ],
  /** 面试状态变为 offer（拿到 offer） */
  offerGot: [
    '恭喜！offer 拿下啦，{name}替你开心',
    '收到 offer 啦！这段时间没白忙',
    '太棒了！快庆祝一下',
    'offer 到手，{name}给你点赞',
    '稳了稳了，恭喜拿到 offer',
    '功夫不负有心人，offer 来咯',
    '好消息！可以放松一下啦',
    'offer 入袋，{name}替你乐',
    '恭喜呀，努力总算有回报',
    '拿下！接下来好好选选',
    '收到 offer 那一刻真值',
    '{name}就知道你行的，恭喜',
  ],
  /** 面试状态变为 rejected（被拒） */
  rejected: [
    '没关系，下一家更合适',
    '被拒不气馁，{name}陪着你',
    '这次没成，总结下再来',
    '别灰心，好机会还在后头',
    '被拒不代表你不行，缓一缓',
    '没关系，路还长着呢',
    '调整下状态，下一个会更好',
    '被拒啦？{name}给你抱抱',
    '别丧气，机会多的是',
    '这次差了点运气，下次稳',
    '失败是过程，不是结局',
    '歇口气，咱们继续投',
  ],
  /** 开启信封 offer 彩蛋时（翻盖露信纸）。含 {firstname}/{company} 变量话术 */
  envelope: [
    '老{firstname}，你要 offer 不要',
    '{firstname}，你的{company} offer 来啦',
    '叮咚！一封来自{company}的信，快拆',
    '来信啦来信啦，{name}帮你念',
    '拆开看看？说不定是好消息哦',
    '这封信鼓鼓的，像装了份 offer',
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
  /** 新建求职手账笔记（鼓励记录向） */
  journalCreate: [
    '新笔记开好啦，想写点啥都行',
    '空白的笔记等你填，{name}陪你写',
    '记下来就不怕忘啦，开写吧',
    '又一页手账，{name}帮你留着这段回忆',
    '落笔就是开始，{name}给你鼓劲',
    '记一笔今天的收获吧～',
    '新笔记到手，灵感别跑掉',
    '把心里话写下来，{name}帮你收好',
    '开写开写，{name}等着看你的故事',
    '记下这点滴，以后翻翻都是财富',
    '新的一页，{name}陪你慢慢填',
    '动笔吧，好记性不如写下来',
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
  /** 进入首页 */
  enterHome: [
    '{name}在这儿！先逛逛看看？',
    '欢迎回来，要不要开始改简历啦？',
    '首页转一圈，{name}陪你看看',
  ],
  /** 进入简历列表 tab */
  enterResumes: [
    '挑一份简历开整吧～',
    '{name}帮你管着简历呢，选哪个？',
    '简历都在这啦，想改哪份？',
  ],
  /** 进入模板市场 tab */
  enterTemplates: [
    '换个模板换个心情～',
    '看看新模板，{name}也想要新衣服',
    '模板挑花眼啦，{name}帮你参谋参谋',
  ],
  /** 进入 AI 设置 tab */
  enterAi: [
    '配好 AI，{name}才能帮你干活呀',
    '先把 AI 调教好，后面省心多啦',
    'AI 设置来啦，填完就能用咯',
  ],
  /** 进入回收站 tab */
  enterTrash: [
    '来回收站逛逛？别删错啦',
    '删掉的简历都在这，{name}帮你看着',
    '回收站里翻翻，有没有误删的',
  ],
  /** 进入我的面试 tab */
  enterInterviews: [
    '面试记录都在这啦，{name}帮你盯着进度',
    '哪几家有戏？{name}陪你捋一捋',
    '别紧张，准备充分就稳了～{name}给你打气',
    '即将面试的别忘了看时间地点哦，{name}提醒你一句',
  ],
  /** 进入面试足迹 tab（地图/路线/打卡回顾向，区别于「我的面试」进度向） */
  enterInterviewFootprint: [
    '面试足迹打开啦，{name}陪你看看都去过哪',
    '在地图上找找那家公司？{name}帮你定位',
    '足迹地图亮起来咯，回忆下每次出征路线',
    '哪几家公司还没去过？{name}陪你圈一圈',
    '把面试地点都标上，{name}帮你规划路线',
    '看看你的面试版图，{name}觉得挺壮观',
    '足迹连成线啦，{name}陪你回顾这一路',
    '地图开了就能看到公司位置咯，{name}提醒你',
    '面试跑过的地方都在这，{name}帮你记着呢',
    '规划下下次面试路线？{name}给你当导航',
  ],
  /** 进入求职手账 tab（卡片网格管理笔记/记事本，记录求职心得向） */
  enterJournal: [
    '手账打开啦，{name}陪你记记求职点滴',
    '今天的面试心得，顺手记下来吧',
    '笔记本翻开了，{name}帮你一起整理',
    '记一笔吧，好记性不如烂笔头～',
    '手账里藏着你的求职故事，{name}陪你写',
    '来记手账啦？{name}给你递笔',
    '把想法落成文字，{name}觉得更有条理了',
    '手账记起来，复盘多了进步快',
    '翻翻之前的笔记？{name}陪你回顾',
    '记事本和笔记都在这，{name}帮你归置',
  ],
  /** 进入设置 tab */
  enterSettings: [
    '设置面板开啦，调调更顺手',
    '{name}的设置都在这，随便改',
    '来调设置啦？{name}听你的',
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
    '好嘞，用眼太久{name}可要念叨你咯',
  ],
  /** 休息提醒关闭 */
  restOff: [
    '休息提醒关啦，记得自己按时歇眼睛哦',
    '好叭，{name}不催了，但眼睛累了自己要停',
    '关啦，那{name}相信你会自觉歇眼的',
  ],
  /** 地图功能开启 */
  mapOn: [
    '地图开好啦，{name}能帮你找公司位置咯',
    '收到！地图功能上线，面试地点一目了然',
    '地图点亮！{name}陪你规划面试路线',
    '好嘞，地图开了，看看那家公司在哪',
    '地图功能开咯，{name}给你当小导航',
    '开启地图模式，面试地点再也不怕找不着',
    '地图就绪！{name}帮你把面试地点标出来',
    '收到，地图功能开啦，路线规划走起',
    '地图开好啦，{name}陪你画面试版图',
    '好嘞，地图上线，哪几家远一目了然',
  ],
  /** 地图功能关闭 */
  mapOff: [
    '地图关啦，要用的时候再叫{name}开',
    '好叭，地图收起来咯',
    '关啦，那面试地点自己记牢哦',
    '地图关了，{name}暂时不当导航啦',
    '收到，地图功能已关闭',
    '好，地图先收着，需要再说',
    '地图关啦，{name}相信你认得路',
    '关咯，那面试路线自己规划下？',
    '地图功能关闭，{name}歇会儿导航',
    '好叭，地图收起，需要时{name}再开',
  ],
  /** 面试提示开启 */
  interviewHintOn: [
    '面试提示开好啦，{name}会盯着面试时间的',
    '收到！到点面试{name}会提醒你',
    '好嘞，面试提示上线，重要时刻不漏',
    '面试提醒开咯，{name}帮你记着日程',
    '开启面试提示，快面试时{name}喊你',
    '好嘞，面试提示就位，安心准备吧',
    '面试提醒开啦，{name}替你盯着时间',
    '收到，面试提示开好，重要节点{name}都记着',
    '面试提示上线，{name}陪你守好每个时间点',
    '好嘞，开咯，面试前{name}会提醒你的',
  ],
  /** 面试提示关闭 */
  interviewHintOff: [
    '面试提示关啦，面试时间自己记牢哦',
    '好叭，{name}不催了，但别忘了面试时间',
    '关啦，那面试日程得自己上心咯',
    '面试提醒关了，{name}相信你会守时',
    '收到，面试提示已关闭',
    '好，面试提示先关着，需要再开',
    '面试提示关啦，重要面试自己定个闹钟？',
    '关咯，那面试时间{name}就不念叨了',
    '面试提醒关闭，{name}歇会儿催活',
    '好叭，提示关了，面试时间自己留意哦',
  ],
  /** 面试临近提醒（30分钟/10分钟前触发） */
  interviewSoon: [
    '面试快开始啦，最后再过一遍',
    '马上要面试了，深呼吸放松下',
    '时间到咯，该上场了，加油',
    '面试进行中，稳住别慌',
    '快面试了，资料都备齐没',
    '要开始啦，{name}给你壮壮胆',
    '最后一刻，调整好状态冲',
    '面试时间到，自信点你能行',
    '快上场啦，{name}陪着你',
    '要面试咯，把要点再默一遍',
    '时间临近，准备好的都拿出来',
    '马上开场，{name}看好你哦',
  ],
  /** AI 动态话术开启（AI 失败时回退） */
  aiChatOn: [
    '好嘞，{name}以后说话更花哨咯',
    'AI 话术开啦，看我花式整活',
    '开启花式模式，{name}嘴皮子要溜起来啦',
  ],
  /** AI 动态话术关闭（AI 失败时回退） */
  aiChatOff: [
    '好吧，那{name}说回老台词啦',
    '关啦，{name}还是原来的配方',
    '收到，{name}回归经典款台词',
  ],
} as const

export type QuoteCategory = keyof typeof quotes

// ========== 时段招呼 ==========
/** 时段：早晨 05-10 / 中午 11-13 / 下午 14-17 / 晚上 18-22 / 深夜 23-04 */
export type TimePeriod = 'morning' | 'noon' | 'afternoon' | 'evening' | 'lateNight'

/** 按当前小时返回时段 */
export const getTimePeriod = (hour: number): TimePeriod => {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'lateNight'
}

/**
 * greet 静态回退按时段分流的招呼池（关 AI 开关 / 无配置 / AI 失败时用）。
 * AI 路径的时段感由 petAiQuote 的 period 上下文注入，与此互补。
 * quotes.greet 的通用条目作为时段池缺失时的最终兜底。
 */
const greetByPeriod: Record<TimePeriod, string[]> = {
  morning: [
    '早安！新的一天，简历搞起来～',
    '早上好呀，今天元气满满',
    '早～趁清醒先把简历改了',
  ],
  noon: [
    '中午啦，吃完饭再来改简历吧',
    '午安，歇会儿再继续～',
    '午饭后犯困？{name}陪你撑一会儿',
  ],
  afternoon: [
    '下午好，进度怎么样啦？',
    '喝杯水继续，{name}陪着你',
    '下午茶时间到，{name}也想喝一口',
  ],
  evening: [
    '晚上好，今晚要冲一波简历吗？',
    '夜里改简历，记得别熬太晚',
    '晚上效率高，{name}也精神着呢',
  ],
  lateNight: [
    '夜深了…还在肝简历？早点歇吧',
    '这么晚了，{name}心疼你的发际线',
    '深夜修简历，明早起来看会更清醒',
  ],
}

/** 话术变量：name 桌宠名 / firstname 用户名首字 / company 公司名。全可选。 */
export interface QuoteVars {
  name?: string
  firstname?: string
  company?: string
}

/**
 * 变量插值：替换 {name} / {firstname} / {company}。
 * - {name} 缺省回退 "v仔"
 * - {firstname} 有值才替换；无值时把前缀"老{firstname}，"整段移除（如"老{firstname}，你要 offer 不要"→"你要 offer 不要"）
 * - {company} 无值时替换为空串
 */
const fillVars = (raw: string, vars?: string | QuoteVars): string => {
  const v: QuoteVars = typeof vars === 'string' ? { name: vars } : (vars ?? {})
  let out = raw.split('{name}').join(v.name || 'v仔')
  out = out.split('{company}').join(v.company || '')
  if (v.firstname) {
    out = out.split('{firstname}').join(v.firstname)
  } else {
    // ponytail: firstname 无值时整段移除"老{firstname}，"前缀（中英文逗号均覆盖）
    out = out.replace(/老\{firstname\}[，,]\s*/g, '').split('{firstname}').join('')
  }
  return out
}
export { fillVars as fillVarsTester }

/**
 * 随机取某分类的一条话术；分类为空则回退到 idle。
 * name 用于替换占位符 {name}（当前桌宠名字）；缺省回退"v仔"。
 * 第二参兼容旧用法（传 string 当 name）与对象（传 { name, firstname, company }）。
 * greet 按当前时段从 greetByPeriod 取（静态分时段招呼）；时段池为空才回退通用条目。
 * 注意：idle 分类请用 pickIdleQuote（支持简历话术过滤），此处 idle 取全量。
 */
export const pickQuote = (category: QuoteCategory, vars?: string | QuoteVars): string => {
  // greet 静态回退分时段：早晨说早晨话、深夜说深夜话
  if (category === 'greet') {
    const periodList = greetByPeriod[getTimePeriod(new Date().getHours())]
    const list = periodList.length ? periodList : (quotes.greet as readonly string[])
    const raw = list[Math.floor(Math.random() * list.length)]
    return fillVars(raw, vars)
  }
  const list = quotes[category] ?? quotes.idle
  // idle 是 IdleQuote[]，其余分类是 string[]
  if (category === 'idle') {
    const raw = (list as IdleQuote[])[Math.floor(Math.random() * list.length)]
    return fillVars(raw.text, vars)
  }
  const raw = (list as readonly string[])[Math.floor(Math.random() * list.length)]
  return fillVars(raw, vars)
}

/**
 * 取一条 idle 话术；inEditor=false 时过滤掉简历相关条目（resume:true）。
 * 过滤后若为空（极端情况）回退到第一条非简历条目。
 */
export const pickIdleQuote = (inEditor: boolean, vars?: string | QuoteVars): string => {
  const filtered = inEditor
    ? quotes.idle
    : quotes.idle.filter(q => !q.resume)
  const list = filtered.length ? filtered : quotes.idle.filter(q => !q.resume)
  const raw = list[Math.floor(Math.random() * list.length)]
  return fillVars(raw.text, vars)
}
