/**
 * 高德地图 JS API 2.0 封装
 * ponytail: 复用 main.ts 的 createElement('script') 动态注入模式，不引入 @amap/amap-jsapi-loader
 * 模块级单例防重复注入；Key + 安全密钥由用户在设置面板填，运行时传入
 * 全局 AMap 类型由 @amap/amap-jsapi-types 提供（tsconfig types 已加载）
 * 注：JS API 2.0 强制 securityJsCode，不配则 PlaceSearch 等服务接口返回 INVALID_USER_SCODE
 */

export interface LngLat {
  lng: number
  lat: number
}

export interface PoiResult {
  name: string
  address: string
  lng: number
  lat: number
}

let amapPromise: Promise<typeof AMap> | null = null
let loadedKey = ''

/**
 * 加载高德 JS SDK（模块级单例）。
 * key/securityJsCode 变化时重新加载。
 */
export function loadAMap(key: string, securityJsCode?: string): Promise<typeof AMap> {
  if (!key) return Promise.reject(new Error('未配置高德地图 Key'))
  // 已加载且 Key 未变 → 直接用
  if (window.AMap && key === loadedKey) return Promise.resolve(window.AMap)
  // Key 变了 → 丢弃旧 promise 重新加载
  if (key !== loadedKey) amapPromise = null

  if (!amapPromise) {
    loadedKey = key
    // 安全密钥必须在 SDK 加载前设置（JS API 2.0 强制要求，否则服务接口返回 INVALID_USER_SCODE）
    if (securityJsCode) {
      (window as any)._AMapSecurityConfig = { securityJsCode }
    } else {
      delete (window as any)._AMapSecurityConfig
    }
    amapPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`
      s.onload = () => {
        if (window.AMap) resolve(window.AMap)
        else reject(new Error('高德 SDK 加载失败：window.AMap 未挂载'))
      }
      s.onerror = () => reject(new Error('高德 SDK 加载失败，请检查网络或 Key 是否正确'))
      document.head.appendChild(s)
    })
  }
  return amapPromise
}

/** 等待 SDK 就绪的便捷判断 */
export function isAmapLoaded(): boolean {
  return !!window.AMap
}

/**
 * POI 搜索（地点检索），供面试录入弹窗用。
 * city 可选，限定城市范围。
 */
export async function searchPoi(keyword: string, city?: string, key?: string, securityJsCode?: string): Promise<PoiResult[]> {
  if (!keyword.trim()) return []
  const AMap = await ensureAmap(key, securityJsCode)
  // ponytail: PlaceSearch 等插件是 AMap.plugin 动态加载的，类型包未覆盖插件类，这里断言 any
  const A: any = AMap
  return new Promise((resolve, reject) => {
    A.plugin('AMap.PlaceSearch', () => {
      const placeSearch = new A.PlaceSearch({
        city: city || '全国',
        pageSize: 20,
        pageIndex: 1,
      })
      placeSearch.search(keyword, (status: string, result: any) => {
        if (status !== 'complete') {
          console.error('[amapService] PlaceSearch 失败:', {
            status,
            info: result?.info,
            infocode: result?.infocode,
          })
        }
        if (status === 'complete') {
          // JS API 2.0 结构：result.poiList.pois；1.4 结构：result.pois。兼容两者
          const pois = (result?.poiList?.pois ?? result?.pois ?? []).filter((p: any) => p.location)
          resolve(
            pois.map((p: any) => ({
              name: p.name,
              address: p.address || p.name,
              lng: p.location.getLng(),
              lat: p.location.getLat(),
            })),
          )
        } else if (status === 'no_data') {
          resolve([])
        } else {
          const parts = [
            result?.info && `info=${result.info}`,
            result?.infocode && `code=${result.infocode}`,
            `status=${status}`,
          ].filter(Boolean)
          reject(new Error(`POI 搜索失败（${parts.join(' | ')}）`))
        }
      })
    })
  })
}

/**
 * 地理编码：地址文本 → 经纬度。
 * 仅对无经纬度的旧面试数据兜底；新数据录入时已存经纬度，不走这里。
 * 成功后由调用方落盘到面试记录的 locationLng/Lat，下次不再调本函数。
 */
export async function geocode(address: string, key?: string, securityJsCode?: string): Promise<LngLat | null> {
  if (!address.trim()) return null

  const AMap = await ensureAmap(key, securityJsCode)
  const A: any = AMap
  return new Promise((resolve) => {
    A.plugin('AMap.Geocoder', () => {
      const geocoder = new A.Geocoder({ city: '全国' })
      geocoder.getLocation(address, (status: string, result: any) => {
        if (status === 'complete' && result?.geocodes?.length) {
          const g = result.geocodes[0]
          resolve({ lng: g.location.getLng(), lat: g.location.getLat() })
        } else {
          resolve(null)
        }
      })
    })
  })
}

/**
 * 浏览器定位（面试足迹 tab 的「定位到我」）。
 * 失败返回 null（定位被拒/超时/不支持），由调用方处理降级。
 */
export async function getMyPosition(key?: string, securityJsCode?: string): Promise<LngLat | null> {
  const AMap = await ensureAmap(key, securityJsCode)
  const A: any = AMap
  return new Promise((resolve) => {
    A.plugin('AMap.Geolocation', () => {
      const geolocation = new A.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        GeoLocationFirst: false,
      })
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result?.position) {
          resolve({ lng: result.position.getLng(), lat: result.position.getLat() })
        } else {
          resolve(null)
        }
      })
    })
  })
}

/** 两点直线距离（米），用高德 GeometryUtil；SDK 未加载时回退 haversine */
export function calcDistance(a: LngLat, b: LngLat): number {
  if (window.AMap?.GeometryUtil?.distance) {
    return window.AMap.GeometryUtil.distance([a.lng, a.lat], [b.lng, b.lat])
  }
  // ponytail: SDK 未就绪时的 haversine 兜底，误差 < 0.5%
  return haversine(a, b)
}

function haversine(a: LngLat, b: LngLat): number {
  const R = 6371000 // 地球半径（米）
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** 距离格式化：<1km 显示 m，否则 km 保留 1 位 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/** 耗时格式化：秒 → 「N 分钟」或「N 小时 M 分钟」 */
export function formatDuration(sec: number): string {
  if (!sec) return '0 分钟'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`
}

// ponytail: 路线规划——高德 JS API 2.0 自带 Driving/Transfer/Walking/Riding 四个插件，
// 统一抽成 RouteMode + RoutePlan 结构，避免调用方处理四套各异的原生返回。
export type RouteMode = 'transfer' | 'driving' | 'walking' | 'riding'

/** 一段路线明细（步行/乘车/驾车等统一结构），供弹窗逐段展示 */
export interface RouteSegment {
  /** 中文类型：步行 / 地铁 / 公交 / 驾车 / 骑行 / 出发 / 到达 */
  type: string
  /** 该段标题：地铁=「地铁 4 号线(大兴线)」、公交=「公交 123路」、步行/驾车=转向指引 */
  title: string
  /** 该段耗时（秒），0 表示未知 */
  duration: number
  /** 该段距离（米），0 表示未知 */
  distance: number
  /** 辅助信息：地铁/公交=「经 3 站」、步行=「约 800 米」等，无则空串 */
  detail: string
}

export interface RoutePlan {
  /** 总耗时（秒） */
  duration: number
  /** 总距离（米） */
  distance: number
  /** 方案概要：各段标题中文拼接，如「步行 → 地铁 4 号线 → 步行」 */
  summary: string
  /** 逐段明细 */
  segments: RouteSegment[]
}

/**
 * 路线规划：按出行方式查询起终点方案。
 * city 用于公交地铁 cityd 参数（跨城公交），默认 '全国'。
 * 返回多个方案（公交通常多条，驾车/步行/骑行通常 1 条）；无方案返回空数组。
 */
export async function planRoute(
  mode: RouteMode,
  from: LngLat,
  to: LngLat,
  key?: string,
  securityJsCode?: string,
  city = '全国',
): Promise<RoutePlan[]> {
  const AMap = await ensureAmap(key, securityJsCode)
  const A: any = AMap
  const fromLngLat = [from.lng, from.lat]
  const toLngLat = [to.lng, to.lat]

  if (mode === 'transfer') {
    return new Promise((resolve) => {
      A.plugin('AMap.Transfer', () => {
        const trans = new A.Transfer({ city, cityd: city })
        trans.search(fromLngLat, toLngLat, (status: string, result: any) => {
          if (status !== 'complete' || !result?.plans?.length) return resolve([])
          resolve(
            result.plans.map((p: any) => {
              const segs = parseTransferSegments(p.segments ?? [])
              return {
                duration: p.time ?? 0,
                distance: p.distance ?? 0,
                segments: segs,
                summary: summarizeSegments(segs),
              }
            }),
          )
        })
      })
    })
  }

  // driving/walking/riding 共享 search(origin, destination, cb) 接口，仅插件名与返回字段细节不同
  // ponytail: A.plugin 需要 'AMap.Driving' 全名，但构造器挂在 A.Driving（短名），故分别存全名与短名
  const pluginMap: Record<Exclude<RouteMode, 'transfer'>, { full: string; short: string }> = {
    driving: { full: 'AMap.Driving', short: 'Driving' },
    walking: { full: 'AMap.Walking', short: 'Walking' },
    riding: { full: 'AMap.Riding', short: 'Riding' },
  }
  const spec = pluginMap[mode as Exclude<RouteMode, 'transfer'>]
  // ponytail: driving 用 '驾车'，walking 用 '步行'，riding 用 '骑行'，作为每段的中文类型
  const typeLabel = mode === 'driving' ? '驾车' : mode === 'walking' ? '步行' : '骑行'
  return new Promise((resolve) => {
    A.plugin(spec.full, () => {
      const planner = new A[spec.short]({ city })
      planner.search(fromLngLat, toLngLat, (status: string, result: any) => {
        if (status !== 'complete' || !result?.routes?.length) return resolve([])
        resolve(
          result.routes.map((r: any) => {
            const duration = r.time ?? 0
            const distance = r.distance ?? 0
            // ponytail: 步行段数少保留逐条指引；驾车/骑行按道路合并精简，避免几十条转向指引密密麻麻
            // 驾车返回 route.steps，骑行返回 route.rides（字段结构相同），两者都按道路合并
            const rawSteps = r.steps ?? r.rides ?? []
            const segs = mode === 'walking'
              ? parseRouteSegments(rawSteps, typeLabel)
              : parseRouteSegmentsMerged(rawSteps, typeLabel)
            return {
              duration,
              distance,
              segments: segs,
              // ponytail: 驾车/骑行概要 = 时长距离总览；步行 = 各段拼接
              summary: mode === 'walking'
                ? summarizeSegments(segs)
                : `全程 ${formatDistance(distance)}，约 ${formatDuration(duration)}`,
            }
          }),
        )
      })
    })
  })
}

/**
 * 驾车/骑行 steps 按道路合并：连续同 road_name 的 step 合并成一段，
 * 标题用路名（无路名用首条指引），detail 累加距离 + 耗时。
 * 效果：「中关村大街 3.2 公里 · 8 分钟」而非几十条「沿中关村大街向南行驶…左转」。
 */
function parseRouteSegmentsMerged(steps: any[], typeLabel: string): RouteSegment[] {
  const merged: RouteSegment[] = []
  for (const s of steps) {
    const road = s.road_name || s.road || ''
    const last = merged[merged.length - 1]
    // ponytail: 连续同路名（且非空）合并，累加距离/耗时
    if (road && last && last.title === road) {
      last.distance += s.distance ?? 0
      last.duration += s.time ?? 0
    } else {
      merged.push({
        type: typeLabel,
        title: road || s.instruction || '前行',
        duration: s.time ?? 0,
        distance: s.distance ?? 0,
        detail: '',
      })
    }
  }
  // ponytail: 合并后再补 detail（距离 + 耗时），统一格式
  for (const m of merged) {
    const parts: string[] = []
    if (m.distance) parts.push(formatDistance(m.distance))
    if (m.duration) parts.push(formatDuration(m.duration))
    m.detail = parts.join(' · ')
  }
  return merged
}

/** 驾车/步行/骑行的 steps：每段 instruction 是中文转向指引，直接作标题（仅步行用） */
function parseRouteSegments(steps: any[], typeLabel: string): RouteSegment[] {
  return steps.map((s: any) => ({
    type: typeLabel,
    title: s.instruction || s.road_name || '前行',
    duration: s.time ?? 0,
    distance: s.distance ?? 0,
    detail: s.distance ? `约 ${formatDistance(s.distance)}` : '',
  }))
}

/**
 * 解析公交方案 segments 为统一明细。
 * 高德 Transfer segment 真实结构（JS API 2.0）：
 *   transit_mode：WALK/SUBWAY/BUS/TAXI/RAIL（乘车/步行标识）
 *   instruction：整段中文描述（如「乘坐21路(...)途径8站到达北京东路江西中路」「步行403米到达XX」）
 *   time/distance：秒/米
 *   乘车段 transit 子对象：
 *     lines[0].name：线路全名（带括号起终，如「21路(广粤路丰镇路--愚园路胶州路)」「地铁2号线(...)」）
 *     via_num：途经站数（数字）
 *     on_station.name / off_station.name：上下车站
 *     entrance.name / exit.name：地铁进出站口（仅地铁段）
 */
function parseTransferSegments(raw: any[]): RouteSegment[] {
  return raw.map((s: any) => {
    const mode = s.transit_mode
    const isWalk = mode === 'WALK'
    const type = transferModeLabel(mode)
    const transit = s.transit ?? {}
    // ponytail: 线路全名带括号后缀（起终站），太长，概要/标题只留括号前的短名（如「21路」「地铁2号线」）
    const fullName = transit.lines?.[0]?.name ?? ''
    const shortName = fullName ? fullName.replace(/（.*$|\(.*$/, '') : ''
    const title = isWalk ? '步行' : (shortName || fullName || type)
    const viaNum = transit.via_num ?? transit.via_stops?.length ?? 0
    let detail = ''
    if (isWalk) {
      if (s.distance) detail = `约 ${formatDistance(s.distance)}`
    } else {
      // ponytail: 乘车段 detail = 「经 N 站 · 上车站 → 下车站」；地铁段再拼进出站口
      const parts: string[] = []
      if (viaNum > 0) parts.push(`经 ${viaNum} 站`)
      if (transit.on_station?.name && transit.off_station?.name) {
        parts.push(`${transit.on_station.name} → ${transit.off_station.name}`)
      }
      detail = parts.join(' · ')
    }
    return {
      type,
      title,
      duration: s.time ?? 0,
      distance: s.distance ?? 0,
      detail,
    }
  })
}

/** 高德 transit_mode → 中文类型 */
function transferModeLabel(mode: string): string {
  switch (mode) {
    case 'WALK': return '步行'
    case 'SUBWAY': return '地铁'
    case 'BUS': return '公交'
    case 'TAXI': return '出租车'
    case 'RAIL': return '火车'
    default: return mode || '乘车'
  }
}

/** 概要：像高德 APP 那样突出乘车段，步行段弱化为「步行 N米」 */
function summarizeSegments(segs: RouteSegment[]): string {
  if (segs.length === 0) return ''
  const parts: string[] = []
  for (const s of segs) {
    if (s.type === '步行') {
      const label = s.distance ? `步行${formatDistance(s.distance)}` : '步行'
      if (parts.length > 0 && parts[parts.length - 1].startsWith('步行')) {
        parts[parts.length - 1] = label
      } else {
        parts.push(label)
      }
    } else {
      // ponytail: 乘车段概要 = 短线路名 + 站数（如「21路 经 8 站」「地铁2号线 经 7 站」），站数从 detail 头部取
      const viaMatch = s.detail.match(/^经 (\d+) 站/)
      const viaStr = viaMatch ? ` ${viaMatch[0]}` : ''
      parts.push(`${s.title}${viaStr}`)
    }
  }
  return parts.join(' → ')
}

/** 内部：确保 SDK 已加载（key 从参数透传，调用方从 settingsStore 取） */
async function ensureAmap(key?: string, securityJsCode?: string): Promise<typeof AMap> {
  if (window.AMap) return window.AMap
  if (!key) throw new Error('未配置高德地图 Key')
  return loadAMap(key, securityJsCode)
}
