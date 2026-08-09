<template>
  <div class="footprint-panel">
    <!-- 顶部工具栏 -->
    <div class="footprint-panel__header">
      <h2 class="footprint-panel__title">
        <Icon icon="mdi:map-marker-path" :width="24" />
        面试足迹
        <span v-if="markers.length > 0" class="footprint-panel__count">{{ markers.length }}</span>
      </h2>

      <div class="footprint-panel__toolbar">
        <div class="footprint-legend">
          <span
            v-for="item in legendItems"
            :key="item.status"
            class="footprint-legend__item"
          >
            <span class="footprint-legend__dot" :style="{ background: item.color }" />
            {{ item.label }}
          </span>
        </div>
        <div class="location-group">
          <!-- 主按钮：有上次搜索位置→点击切回，无→打开搜索 -->
          <NButton
            size="small"
            :disabled="!mapReady"
            :title="lastSearchedLocation ? `切回「${lastSearchedLocation.name}」` : '搜索一个地点作为我的位置'"
            @click="onMainLocationClick"
          >
            <Icon icon="mdi:map-marker" :width="16" />
            {{ currentLocationName || (lastSearchedLocation ? lastSearchedLocation.name : '搜索位置') }}
          </NButton>
          <!-- 搜索图标按钮：仅主按钮变为「切回」时显示（无 lastSearchedLocation 时主按钮已能打开搜索） -->
          <NButton
            v-if="lastSearchedLocation"
            size="small"
            quaternary
            :disabled="!mapReady"
            title="搜索新位置"
            @click="showPoiSearch = true"
          >
            <Icon icon="mdi:map-search-outline" :width="16" />
          </NButton>
        </div>
        <!-- 切回浏览器定位 -->
        <NButton
          v-if="currentLocationName"
          size="small"
          title="切回定位的当前位置"
          @click="onBackToMyLocation"
        >
          <Icon icon="mdi:crosshairs-gps" :width="16" />
          当前位置
        </NButton>
        <!-- 居中：地图平移到当前 myPosition 中心，不改 myPosition -->
        <NButton
          size="small"
          :disabled="!mapReady || !myPosition"
          title="地图居中到我的位置"
          @click="myPosition && applyMyPosition(myPosition, currentLocationName)"
        >
          <Icon icon="mdi:image-filter-center-focus" :width="16" />
          居中
        </NButton>
        <NButton
          size="small"
          :loading="locating"
          :disabled="!mapReady"
          title="重新定位并更新缓存"
          @click="onRefreshLocation"
        >
          <Icon icon="mdi:refresh" :width="16" />
          刷新定位
        </NButton>
        <NSwitch
          v-model:value="showLines"
          size="small"
          :disabled="!myPosition"
        >
          <template #checked>连线</template>
          <template #unchecked>连线</template>
        </NSwitch>
      </div>
    </div>

    <!-- 地图主体 -->
    <div class="footprint-panel__body">
      <!-- 空态：未启用地图功能 -->
      <div v-if="!amapEnabled" class="footprint-empty">
        <Icon icon="mdi:map-marker-off" :width="48" />
        <p class="footprint-empty__title">地图功能未启用</p>
        <p class="footprint-empty__desc">请在「设置 → 地图设置」中开启地图功能并填写高德地图 Key</p>
        <NButton size="small" @click="goSettings">去设置</NButton>
      </div>
      <!-- 空态：未配置 Key -->
      <div v-else-if="!hasKey" class="footprint-empty">
        <Icon icon="mdi:map-marker-outline" :width="48" />
        <p class="footprint-empty__title">未配置高德地图</p>
        <p class="footprint-empty__desc">请先在「设置 → 地图设置」中填写高德地图 Key 与安全密钥</p>
        <NButton size="small" @click="goSettings">去设置</NButton>
      </div>
      <!-- 空态：无面试数据 -->
      <div v-else-if="interviews.length === 0" class="footprint-empty">
        <Icon icon="mdi:briefcase-outline" :width="48" />
        <p class="footprint-empty__title">还没有面试记录</p>
        <p class="footprint-empty__desc">去「我的面试」添加面试后，这里会标出足迹</p>
      </div>
      <!-- 地图 + 列表 双栏 -->
      <template v-else>
        <div ref="mapWrapEl" class="footprint-map-wrap" :class="{ 'is-fullscreen': isFullscreen }">
          <div ref="mapEl" class="footprint-map"></div>
          <!-- 全屏按钮（右上角浮层） -->
          <NButton
            size="small"
            class="footprint-map__fullscreen"
            :title="isFullscreen ? '退出全屏' : '全屏'"
            @click="toggleFullscreen"
          >
            <Icon :icon="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" :width="16" />
          </NButton>
          <!-- 提示条 -->
          <p v-if="geocodeFailedCount > 0" class="footprint-hint footprint-hint--warn">
            {{ geocodeFailedCount }} 条面试地址无法定位，建议在「我的面试」用搜索按钮重新选地点
          </p>
          <p v-else-if="myPosition && !showLines" class="footprint-hint">
            开启「连线」可查看各面试点与你的距离
          </p>
          <p v-if="locateFailed" class="footprint-hint footprint-hint--warn">
            定位失败，请允许定位权限后重试
          </p>
        </div>

        <!-- 列表侧栏 -->
        <aside class="footprint-list">
          <div class="footprint-list__sort">
            <NButtonGroup size="small">
              <NButton
                :type="locationMode === 'work' ? 'primary' : 'default'"
                title="显示工作地点"
                @click="locationMode = 'work'"
              >
                <Icon icon="mdi:office-building-outline" :width="14" />
                工作
              </NButton>
              <NButton
                :type="locationMode === 'interview' ? 'primary' : 'default'"
                title="显示面试地点"
                @click="locationMode = 'interview'"
              >
                <Icon icon="mdi:account-tie-voice-outline" :width="14" />
                面试
              </NButton>
            </NButtonGroup>
            <NButtonGroup size="small">
              <NButton
                :type="sortMode === 'company' ? 'primary' : 'default'"
                @click="sortMode = 'company'"
              >
                <Icon icon="mdi:sort-alphabetical" :width="14" />
                公司
              </NButton>
              <NButton
                :type="sortMode === 'distance' ? 'primary' : 'default'"
                :disabled="!myPosition"
                :title="!myPosition ? '需开启位置权限' : ''"
                @click="sortMode = 'distance'"
              >
                <Icon icon="mdi:map-marker-distance" :width="14" />
                远近
              </NButton>
            </NButtonGroup>
            <NButton
              size="small"
              quaternary
              :title="sortAsc ? '升序' : '降序'"
              @click="sortAsc = !sortAsc"
            >
              <Icon :icon="sortAsc ? 'mdi:sort-ascending' : 'mdi:sort-descending'" :width="16" />
            </NButton>
          </div>

          <div class="footprint-list__items">
            <div
              v-for="item in sortedList"
              :key="item.iv.id"
              class="footprint-card"
              @click="focusMarker(item)"
            >
              <div class="footprint-card__head">
                <span class="footprint-card__company">{{ item.iv.company || '未命名' }}</span>
                <span class="footprint-card__status" :style="{ color: STATUS_COLOR[item.iv.status] }">● {{ STATUS_LABEL[item.iv.status] }}</span>
              </div>
              <div class="footprint-card__meta">
                <span v-if="item.iv.position">{{ item.iv.position }}</span>
                <span v-if="item.iv.salary" class="footprint-card__salary">{{ item.iv.salary }}</span>
              </div>
              <div v-if="sortMode === 'distance' && myPosition" class="footprint-card__dist">
                距我 {{ formatDistance(item.dist!) }}
              </div>
              <div class="footprint-card__footer">
                <button
                  type="button"
                  class="footprint-card__go"
                  title="查看从这里出发的路线方案"
                  @click.stop="onGoHere(item)"
                >
                  <Icon icon="mdi:map-marker-distance" :width="14" />
                  去这里
                </button>
              </div>
            </div>
            <p v-if="sortedList.length === 0" class="footprint-list__empty">
              没有已填{{ locationMode === 'work' ? '工作地点' : '面试地点' }}的面试
            </p>
          </div>
        </aside>
      </template>
    </div>

    <!-- 搜索位置弹窗：选中后作为「我的位置」+ 入历史 LRU -->
    <PoiSearchModal
      :visible="showPoiSearch"
      show-history
      @close="showPoiSearch = false"
      @select="onSelectPoi"
    />

    <!-- 路线方案弹窗：起点 myPosition，终点为所选面试点 -->
    <RoutePlanModal
      :visible="showRoutePlan"
      :company="routeTarget?.iv.company || ''"
      :end-label="routeTarget?.iv.location || routeTarget?.iv.interviewLocation || '面试地点'"
      :from="myPosition"
      :to="routeTarget?.pos ?? null"
      @close="showRoutePlan = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { NButton, NButtonGroup, NSwitch } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useInterviewStore } from '@/stores/interviewStore'
import type { Interview, InterviewStatus } from '@/types/interview'
import { loadAMap, geocode, getMyPosition, calcDistance, formatDistance, type LngLat } from '@/services/amapService'
import type { MapLocationItem } from '@/utils/storageAdapter'
import PoiSearchModal from '@/components/dashboard/PoiSearchModal.vue'
import RoutePlanModal from '@/components/dashboard/RoutePlanModal.vue'
import { message as naiveMessage } from '@/plugins/naive-ui'

const router = useRouter()
const settingsStore = useSettingsStore()
const interviewStore = useInterviewStore()

const mapEl = ref<HTMLDivElement | null>(null)
const mapWrapEl = ref<HTMLDivElement | null>(null)
const mapReady = ref(false)
const isFullscreen = ref(false)
const locating = ref(false)
const locateFailed = ref(false)
const showLines = ref(false)
const myPosition = ref<LngLat | null>(null)
// 地址解析失败条数（geocode 兜底失败时提示用户用 POI 搜索重选地点）
const geocodeFailedCount = ref(0)
// 列表排序：company=公司名字典序，distance=离我远近（无 myPosition 时 distance 不可用）
const sortMode = ref<'company' | 'distance'>('company')
const sortAsc = ref(true)
// 地点模式：work=工作地点，interview=面试地点；决定地图标哪类点 + 列表展示哪类有地点的面试
const locationMode = ref<'work' | 'interview'>('work')
// plotMarkers 竞态守卫：mode 切换/数据变化时丢弃旧请求结果，避免慢的旧请求覆盖新视图
let plotToken = 0
// 列表数据：plotMarkers 后填充，供右侧列表渲染 + 排序 + 点击联动
interface MarkerItem { iv: Interview; pos: LngLat; isPoi: boolean; dist: number | null }
const markerItems = ref<MarkerItem[]>([])

// ponytail: 高德实例/marker 等非响应式资源，存模块作用域 ref，避免 Vue 深度代理
let map: any = null
let markers: any[] = []
let polylines: any[] = []
let distanceLabels: any[] = []
let myPositionMarker: any = null

const hasKey = computed(() => !!settingsStore.amapKey)
const amapEnabled = computed(() => settingsStore.amapEnabled)
// 地图可初始化的统一前置：开关开 + Key 已配置
const mapReadyToInit = computed(() => amapEnabled.value && hasKey.value)
const interviews = computed(() => interviewStore.interviews)

// 搜索位置弹窗
const showPoiSearch = ref(false)

// 路线方案弹窗：routeTarget 存当前选中的面试点（含 pos），起点用 myPosition
const showRoutePlan = ref(false)
const routeTarget = ref<MarkerItem | null>(null)
// 当前「我的位置」来源名字：搜索选中时存 POI 名字，浏览器定位时为空（显示"我的位置"）
const currentLocationName = ref('')
// 上次搜索选中的位置（切到浏览器定位后仍保留，方便一键切回）
const lastSearchedLocation = ref<{ lng: number; lat: number; name: string } | null>(null)

// 状态色映射
const STATUS_COLOR: Record<InterviewStatus, string> = {
  drafting: '#909399',      // 灰
  submitted: '#409eff',     // 蓝
  interviewing: '#e6a23c',  // 橙
  offer: '#67c23a',         // 绿
  rejected: '#f56c6c',      // 红
  closed: '#73767a',        // 深灰
}
const STATUS_LABEL: Record<InterviewStatus, string> = {
  drafting: '准备中',
  submitted: '已投递',
  interviewing: '面试中',
  offer: 'Offer',
  rejected: '未通过',
  closed: '已关闭',
}
const legendItems = [
  { status: 'drafting' as InterviewStatus, color: STATUS_COLOR.drafting, label: '准备中' },
  { status: 'submitted' as InterviewStatus, color: STATUS_COLOR.submitted, label: '已投递' },
  { status: 'interviewing' as InterviewStatus, color: STATUS_COLOR.interviewing, label: '面试中' },
  { status: 'offer' as InterviewStatus, color: STATUS_COLOR.offer, label: 'Offer' },
  { status: 'rejected' as InterviewStatus, color: STATUS_COLOR.rejected, label: '未通过' },
]

// 列表排序：公司名字典序（中文用 localeCompare）或离我远近（dist）；升降序切换
const sortedList = computed<MarkerItem[]>(() => {
  const items = [...markerItems.value]
  const dir = sortAsc.value ? 1 : -1
  if (sortMode.value === 'company') {
    items.sort((a, b) => dir * (a.iv.company || '').localeCompare(b.iv.company || '', 'zh'))
  } else {
    // 远近排序：无 dist 的（理论上 markerItems 都有 pos，dist 可能 null）排末尾
    items.sort((a, b) => {
      const da = a.dist ?? Infinity
      const db = b.dist ?? Infinity
      return dir * (da - db)
    })
  }
  return items
})

/** 列表卡片点击：地图平移到 marker + 弹 InfoWindow */
function focusMarker(item: MarkerItem) {
  const m = markers.find((x) => x.iv.id === item.iv.id)
  if (!m || !map) return
  map.setZoomAndCenter(13, [item.pos.lng, item.pos.lat])
  m.info.open(map, m.marker.getPosition())
}

/** 「去这里」：未设置我的位置时提示先定位，否则打开路线方案弹窗 */
function onGoHere(item: MarkerItem) {
  if (!myPosition.value) {
    naiveMessage.warning('请先点击「搜索位置」或「刷新定位」设置我的位置')
    return
  }
  routeTarget.value = item
  showRoutePlan.value = true
}

const goSettings = () => {
  router.push({ query: { tab: 'settings' } })
}

onMounted(async () => {
  if (!mapReadyToInit.value || interviews.value.length === 0) return
  await nextTick()
  await initMap()
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  destroyMap()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

/** 全屏状态变化时同步 isFullscreen，并让地图自适应新尺寸 */
function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
  // 全屏/退出全屏后容器尺寸变了，等下一帧让高德地图自适应
  nextTick(() => map?.setSize?.())
}

/** 切换地图全屏 */
async function toggleFullscreen() {
  if (!mapWrapEl.value) return
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await mapWrapEl.value.requestFullscreen()
    }
  } catch {
    naiveMessage.error('全屏不可用，请检查系统是否支持')
  }
}

// 开关或 Key 变化时重新初始化（关→开初始化，开→关销毁）
watch(mapReadyToInit, async (ready) => {
  if (ready && interviews.value.length > 0) {
    destroyMap()
    await nextTick()
    await initMap()
  } else if (!ready) {
    destroyMap()
  }
})

// Key/安全密钥内容变化（开关已开、hasKey 仍为 true，mapReadyToInit 不变）时重启地图，
// 否则 ensureAmap 的 window.AMap 短路会让旧 Key 的 SDK 一直用到刷新页面
watch(
  () => [settingsStore.amapKey, settingsStore.amapSecurityCode] as const,
  async () => {
    if (mapReadyToInit.value && interviews.value.length > 0) {
      destroyMap()
      await nextTick()
      await initMap()
    }
  },
)

// 面试数据异步加载完后再初始化（mount 时 interviewStore 可能还在读盘，interviews 为空）
watch(interviews, async (list) => {
  if (mapReadyToInit.value && list.length > 0 && !map) {
    await nextTick()
    await initMap()
  }
})

// 地点模式切换：不重建 map 实例（省配额），只清旧 marker 重画对应类别的地点
watch(locationMode, async () => {
  if (!map) return
  // 清连线（旧 marker 被清后连线坐标失效）
  clearLines()
  // backfill=false：mode 切换是视图操作，不回写经纬度（回写只在 initMap 首次加载时做），
  // 避免 updateInterview 触发 interviews 变化引发二次调度，干扰连线重画
  await plotMarkers(false)
  await nextTick()
  // 重画后若连线开着且已有我的位置，按新 marker 重画连线
  if (showLines.value && myPosition.value) drawLines()
})

async function initMap() {
  if (!mapEl.value || !mapReadyToInit.value) {
    return
  }
  try {
    const AMap = await loadAMap(settingsStore.amapKey, settingsStore.amapSecurityCode)
    map = new AMap.Map(mapEl.value, {
      zoom: 11,
      center: [116.397428, 39.90923], // 默认北京
    })
    mapReady.value = true
    await plotMarkers()
    // 进 tab 自动定位到我 + 自动开连线（定位失败/竞态则保持默认，用户可手动点「定位到我」重试）
    // ponytail: onLocate 单独 try——地图已初始化成功，定位只是锦上添花，不应因定位竞态弹「地图初始化失败」误导
    try {
      const located = await onLocate()
      if (located) showLines.value = true
    } catch (e) {
      console.warn('[footprint] 自动定位失败（不影响地图）:', e)
    }
  } catch (e) {
    console.error('[footprint] initMap 失败:', e)
    naiveMessage.error(e instanceof Error ? e.message : '地图初始化失败')
  }
}

function destroyMap() {
  if (map) {
    map.destroy()
    map = null
    markers = []
    markerItems.value = []
    polylines = []
    distanceLabels = []
    myPositionMarker = null
    mapReady.value = false
    myPosition.value = null
  }
}

/** 把所有面试标到地图上，无经纬度的走 geocode 兜底（单条失败不拖垮其他）。
 *  按 locationMode 只取一类地点：work=工作地点，interview=面试地点。
 *  无该类地点的面试静默跳过（不标点不进列表）；有地址但 geocode 失败的计 failedCount 提示。
 *  backfill=true 时回写 geocode 结果到面试记录（仅 initMap 首次加载用）；
 *  mode 切换传 false，避免 updateInterview 触发 interviews 变化引发二次调度干扰连线重画。 */
async function plotMarkers(backfill = true) {
  if (!map) return
  const myToken = ++plotToken
  const AMap = (window as any).AMap
  const list = interviews.value
  // ponytail: 每条 geocode 独立 try/catch，避免单条地址解析抛错导致 Promise.all reject、全部 marker 丢失
  // 按 locationMode 取对应字段：work→location*，interview→interviewLocation*
  // isPoi：经纬度来自 POI 搜索（poiSelected 为 true）才算准确，geocode 兜底不算
  // backfill：geocode 成功后要回写的字段（省下次重复 geocode，落盘走 interviewStore 双后端）
  // 失败标记 geocodeFailed 为 true 时跳过该地址不重试（用户改地址后清除）
  // ponytail: 分批并发（每批 5 条），避免无经纬度面试过多时并发 geocode 触发高德 QPS 限流，
  // 限流返回失败会被永久标 geocodeFailed 不再重试；5 条/批对个人开发者配额（3-10 QPS）安全
  const BATCH = 5
  // 按模式取该条面试的地点字段集合；无该类地点（无文本无经纬度）直接 pos=null 跳过，不发 geocode
  type FieldSet = {
    text: string
    lng?: number
    lat?: number
    poiSelected?: boolean
    geocodeFailed?: boolean
    backfill: 'location' | 'interviewLocation'
  }
  const pickFields = (iv: Interview): FieldSet | null => {
    if (locationMode.value === 'work') {
      if (!iv.location && iv.locationLng == null) return null
      return { text: iv.location, lng: iv.locationLng, lat: iv.locationLat, poiSelected: iv.locationPoiSelected, geocodeFailed: iv.locationGeocodeFailed, backfill: 'location' }
    }
    if (!iv.interviewLocation && iv.interviewLocationLng == null) return null
    return { text: iv.interviewLocation, lng: iv.interviewLocationLng, lat: iv.interviewLocationLat, poiSelected: iv.interviewLocationPoiSelected, geocodeFailed: iv.interviewLocationGeocodeFailed, backfill: 'interviewLocation' }
  }
  const positions: { iv: Interview; pos: LngLat | null; isPoi: boolean; backfill?: 'location' | 'interviewLocation'; geocodeFailed?: 'location' | 'interviewLocation' }[] = []
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (iv): Promise<{ iv: Interview; pos: LngLat | null; isPoi: boolean; backfill?: 'location' | 'interviewLocation'; geocodeFailed?: 'location' | 'interviewLocation' }> => {
        const fs = pickFields(iv)
        // 无该类地点（无文本无经纬度）→ 静默跳过，不标点不计 failed
        if (!fs) return { iv, pos: null, isPoi: false }
        // 有经纬度优先
        if (fs.lng != null && fs.lat != null) {
          return { iv, pos: { lng: fs.lng, lat: fs.lat }, isPoi: !!fs.poiSelected }
        }
        // 有文本走 geocode（失败标记为 true 则跳过不重试）
        if (fs.text && !fs.geocodeFailed) {
          try {
            const pos = await geocode(fs.text, settingsStore.amapKey, settingsStore.amapSecurityCode)
            if (pos) return { iv, pos, isPoi: false, backfill: fs.backfill }
            return { iv, pos: null, isPoi: false, geocodeFailed: fs.backfill }
          } catch { /* geocode 抛错视为失败 */ return { iv, pos: null, isPoi: false, geocodeFailed: fs.backfill } }
        }
        // 有文本但已标 geocodeFailed → 不重试，计 failed
        return { iv, pos: null, isPoi: false, geocodeFailed: fs.backfill }
      }),
    )
    positions.push(...results)
  }

  // 竞态：mode 切换/数据变化时丢弃旧请求结果
  if (myToken !== plotToken) return

  // geocode 结果回写：成功的写经纬度，失败的写失败标记（都走 interviewStore 双后端落盘）
  // 仅 initMap 首次加载时回写（backfill=true）；mode 切换传 false 跳过，避免触发 interviews 变化
  if (backfill) {
    for (const { iv, pos, backfill: bf, geocodeFailed } of positions) {
      if (bf && pos) {
        if (bf === 'location') {
          interviewStore.updateInterview({ ...iv, locationLng: pos.lng, locationLat: pos.lat, locationGeocodeFailed: false })
        } else {
          interviewStore.updateInterview({ ...iv, interviewLocationLng: pos.lng, interviewLocationLat: pos.lat, interviewLocationGeocodeFailed: false })
        }
      } else if (geocodeFailed) {
        if (geocodeFailed === 'location') {
          interviewStore.updateInterview({ ...iv, locationGeocodeFailed: true })
        } else {
          interviewStore.updateInterview({ ...iv, interviewLocationGeocodeFailed: true })
        }
      }
    }
  }

  // 清旧 marker
  markers.forEach((m) => map.remove(m.marker))
  markers = []
  markerItems.value = []
  const items: MarkerItem[] = []
  let failedCount = 0
  for (const { iv, pos, isPoi, geocodeFailed } of positions) {
    // 无该类地点（pos=null 且非 geocodeFailed）→ 静默跳过
    if (!pos) {
      if (geocodeFailed) failedCount++
      continue
    }
    const color = STATUS_COLOR[iv.status]
    const marker = new AMap.Marker({
      position: [pos.lng, pos.lat],
      content: markerContent(color, isPoi),
      offset: new AMap.Pixel(-14, -14),
    })
    const info = new AMap.InfoWindow({
      content: infoContent(iv, pos, isPoi),
      offset: new AMap.Pixel(0, -20),
    })
    marker.on('click', () => info.open(map, marker.getPosition()))
    map.add(marker)
    markers.push({ marker, pos, iv, isPoi, info })
    items.push({
      iv,
      pos,
      isPoi,
      dist: myPosition.value ? calcDistance(myPosition.value, pos) : null,
    })
  }
  markerItems.value = items
  geocodeFailedCount.value = failedCount
  if (markers.length > 0) {
    map.setFitView()
  }
}

/** marker 自定义 DOM 图标 */
function markerContent(color: string, isPoi: boolean): string {
  // ponytail: marker content 由高德注入外部 DOM，scoped 样式作用不到，故全用 inline style + 全局 keyframes（amap-marker-pulse）
  // 无描边；来源准确度（POI/地址解析）改由 InfoWindow 文字标注区分
  void isPoi
  return `<div class="amap-footprint-pin" style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.45);animation:amap-marker-pulse 2s ease-out infinite;"></div>`
}

/** InfoWindow 摘要 HTML */
function infoContent(iv: Interview, pos: LngLat, isPoi: boolean): string {
  const rounds = iv.rounds?.length ?? 0
  let distHtml = ''
  if (myPosition.value) {
    const d = calcDistance(myPosition.value, pos)
    distHtml = `<div style="color:#67c23a;margin-top:4px;">距我约 ${formatDistance(d)}</div>`
  }
  // 来源标注：POI 搜索定位（绿）= 准确；地址解析（灰）= 近似
  const sourceHtml = isPoi
    ? `<span style="color:#67c23a;font-size:11px;">✓ POI 搜索定位</span>`
    : `<span style="color:#bbb;font-size:11px;">~ 地址解析（近似）</span>`
  // 地址行按 locationMode 显示对应地点：work=工作地点，interview=面试地点
  const addr = locationMode.value === 'work' ? iv.location : iv.interviewLocation
  const addrLabel = locationMode.value === 'work' ? '工作地点' : '面试地点'
  return `<div style="padding:4px;min-width:180px;">
    <div style="font-weight:600;font-size:14px;">${escapeHtml(iv.company || '未命名')}</div>
    <div style="color:#666;font-size:12px;margin-top:2px;">${escapeHtml(iv.position || '')}</div>
    <div style="margin-top:4px;font-size:12px;">
      <span style="color:${STATUS_COLOR[iv.status]};">● ${STATUS_LABEL[iv.status]}</span>
      <span style="color:#999;margin-left:8px;">${rounds} 轮</span>
    </div>
    ${addr ? `<div style="color:#999;font-size:12px;margin-top:2px;">📍 ${addrLabel}：${escapeHtml(addr)}</div>` : ''}
    <div style="margin-top:2px;">${sourceHtml}</div>
    ${distHtml}
  </div>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

/** 把一个坐标应用为「我的位置」：设 marker + 移中心 + 重算列表距离。name 为来源名（搜索选中时传 POI 名，浏览器定位传空） */
function applyMyPosition(pos: LngLat, name = '') {
  if (!map) return
  myPosition.value = pos
  currentLocationName.value = name
  const AMap = (window as any).AMap
  if (myPositionMarker) map.remove(myPositionMarker)
  myPositionMarker = new AMap.Marker({
    position: [pos.lng, pos.lat],
    content: '<div style="width:18px;height:18px;border-radius:50%;background:#1989fa;border:3px solid #fff;box-shadow:0 0 0 4px rgba(25,137,250,.25);"></div>',
    offset: new AMap.Pixel(-9, -9),
    zIndex: 200,
  })
  map.add(myPositionMarker)
  map.setZoomAndCenter(12, [pos.lng, pos.lat])
  refreshInfoWindows()
  markerItems.value = markerItems.value.map((it) => ({ ...it, dist: calcDistance(pos, it.pos) }))
  if (showLines.value) drawLines()
}

/** 进 tab 调用：有缓存位置直接用，无缓存才调浏览器定位并落盘（省重复定位） */
async function onLocate(): Promise<boolean> {
  if (!map) return false
  // 缓存优先
  const cached = parseMyLocation(settingsStore.myLocation)
  if (cached) {
    applyMyPosition(cached)
    return true
  }
  // 无缓存 → 浏览器定位 + 落盘
  locating.value = true
  locateFailed.value = false
  try {
    const pos = await getMyPosition(settingsStore.amapKey, settingsStore.amapSecurityCode)
    if (!map) return false
    if (!pos) {
      locateFailed.value = true
      return false
    }
    applyMyPosition(pos)
    settingsStore.updateMyLocation(`${pos.lng},${pos.lat}`)
    return true
  } finally {
    locating.value = false
  }
}

/** 「刷新定位」按钮：强制重新调浏览器定位校准并落盘（进 tab 默认用缓存，此按钮才重新定位） */
async function onRefreshLocation() {
  if (!map) return
  locating.value = true
  locateFailed.value = false
  try {
    const pos = await getMyPosition(settingsStore.amapKey, settingsStore.amapSecurityCode)
    if (!map) return
    if (!pos) {
      locateFailed.value = true
      return
    }
    applyMyPosition(pos)
    settingsStore.updateMyLocation(`${pos.lng},${pos.lat}`)
  } catch (e) {
    // ponytail: getMyPosition 内部 ensureAmap 可能 reject（Key 无效/SDK 加载失败），按钮直调无外层兜底，需置失败态给用户反馈
    locateFailed.value = true
    console.error('[footprint] 刷新定位失败:', e)
  } finally {
    locating.value = false
  }
}

/** 「切回当前位置」按钮：从搜索位置切回浏览器定位的缓存位置（无缓存则重新定位） */
async function onBackToMyLocation() {
  if (!map) return
  const cached = parseMyLocation(settingsStore.myLocation)
  if (cached) {
    applyMyPosition(cached, '')
    return
  }
  // 无缓存（从未定位过）→ 重新调浏览器定位
  await onRefreshLocation()
}

/** 主按钮点击：有上次搜索位置→切回，无→打开搜索 */
function onMainLocationClick() {
  if (lastSearchedLocation.value) {
    const l = lastSearchedLocation.value
    applyMyPosition({ lng: l.lng, lat: l.lat }, l.name)
    return
  }
  showPoiSearch.value = true
}

/** 搜索位置弹窗选中：作为「我的位置」+ 入历史 LRU + 记住为 lastSearchedLocation（切换位置自动重画连线/重算距离） */
function onSelectPoi(poi: { name: string; address: string; lng: number; lat: number }) {
  showPoiSearch.value = false
  if (!map) return
  const item: MapLocationItem = { name: poi.name, address: poi.address, lng: poi.lng, lat: poi.lat }
  lastSearchedLocation.value = { lng: poi.lng, lat: poi.lat, name: poi.name }
  applyMyPosition({ lng: poi.lng, lat: poi.lat }, poi.name)
  settingsStore.addMapLocationHistory(item)
  naiveMessage.success(`已定位到「${poi.name}」`)
}

/** 解析缓存的位置字符串 "lng,lat" → LngLat */
function parseMyLocation(s: string): LngLat | null {
  const [lngStr, latStr] = s.split(',')
  const lng = Number(lngStr)
  const lat = Number(latStr)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return { lng, lat }
}

/** 切换连线开关 */
watch(showLines, (v) => {
  if (!map) return
  if (v && myPosition.value) {
    drawLines()
  } else {
    clearLines()
  }
})

function clearLines() {
  polylines.forEach((p) => map.remove(p))
  distanceLabels.forEach((l) => map.remove(l))
  polylines = []
  distanceLabels = []
}

function drawLines() {
  if (!map || !myPosition.value) return
  clearLines()
  const AMap = (window as any).AMap
  const me = myPosition.value
  for (const m of markers) {
    const line = new AMap.Polyline({
      path: [[me.lng, me.lat], [m.pos.lng, m.pos.lat]],
      strokeColor: '#1989fa',
      strokeWeight: 4,
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
      lineJoin: 'round',
      lineCap: 'round',
    })
    map.add(line)
    polylines.push(line)
    // 距离标签（中点）
    const mid = { lng: (me.lng + m.pos.lng) / 2, lat: (me.lat + m.pos.lat) / 2 }
    const d = calcDistance(me, m.pos)
    const label = new AMap.Text({
      text: formatDistance(d),
      position: [mid.lng, mid.lat],
      offset: new AMap.Pixel(0, -10),
      style: {
        background: '#1989fa',
        padding: '3px 10px',
        'border-radius': '10px',
        'font-size': '13px',
        'font-weight': '600',
        color: '#fff',
        border: '2px solid #fff',
        'box-shadow': '0 2px 6px rgba(0,0,0,.3)',
      },
    })
    map.add(label)
    distanceLabels.push(label)
  }
}

/** 刷新所有 InfoWindow（定位后距离变了） */
function refreshInfoWindows() {
  // markers 结构里存了 iv/pos，InfoWindow 是 click 时才 open 的，无需主动刷新已开窗口
  // 若要实时刷新已打开窗口，可重建 markers 的 click handler；这里保持简单
}
</script>

<style lang="scss" scoped>
.footprint-panel {
  height: 100%;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-md;
    padding-bottom: $spacing-md;
    border-bottom: 1px solid $border-glass;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-lg;
    font-weight: 600;
    margin: 0;
    @include gradient-text;
  }

  &__count {
    font-size: $font-size-xs;
    background: rgba($primary-color, 0.15);
    color: $primary-color;
    padding: 0 6px;
    border-radius: 8px;
    font-weight: 600;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-left: auto;
  }

  .location-group {
    display: flex;
    align-items: center;
    gap: 0; // 主按钮与搜索图标紧贴
  }

  &__body {
    flex: 1;
    position: relative;
    min-height: 70vh;
    display: flex;
    gap: $spacing-md;
    padding-top: $spacing-md;
  }
}

.footprint-map-wrap {
  flex: 1;
  position: relative;
  min-width: 0;

  // 全屏态：脱离 flex 流，铺满屏幕，地图自适应
  &.is-fullscreen {
    width: 100vw;
    height: 100vh;
    background: $bg-glass;
    z-index: 9999;
  }
}

.footprint-map__fullscreen {
  position: absolute;
  top: $spacing-sm;
  right: $spacing-sm;
  // ponytail: 高德地图内部 DOM z-index 较高，按钮需更高才能浮在地图上
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.footprint-list {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  min-height: 0;

  &__sort {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-xs;
    flex-shrink: 0;
  }

  &__items {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    padding-right: 4px;
    @include scrollbar;
  }

  &__empty {
    margin: auto;
    padding: $spacing-lg $spacing-sm;
    text-align: center;
    font-size: $font-size-xs;
    color: $text-light;
  }
}

.footprint-history {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding-bottom: $spacing-xs;
  border-bottom: 1px solid $border-glass;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: $font-size-xs;
    color: $text-secondary;
    font-weight: 600;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 96px;
    overflow-y: auto;
    @include scrollbar;
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    max-width: 100%;
    padding: 2px 6px;
    border: 1px solid $border-glass;
    border-radius: $radius-full;
    background: $bg-glass;
    color: $text-primary;
    font-size: $font-size-xs;
    font-family: inherit;
    cursor: pointer;
    transition: all $transition-base;

    &:hover {
      border-color: $primary-color;
      background: rgba($primary-color, 0.08);
    }
  }

  &__chip-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 120px;
  }

  &__chip-del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: $text-light;
    flex-shrink: 0;
    margin-left: 2px;
    transition: all $transition-base;

    &:hover {
      color: $error-color;
      background: rgba($error-color, 0.12);
    }
  }
}

.footprint-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: $spacing-sm $spacing-md;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  background: $bg-glass;
  cursor: pointer;
  transition: all $transition-base;
  text-align: left;
  color: $text-primary;
  font-family: inherit;

  &:hover {
    border-color: $primary-color;
    background: rgba($primary-color, 0.06);
  }

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $spacing-xs;
  }

  &__company {
    font-weight: 600;
    font-size: $font-size-sm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    font-size: $font-size-xs;
    flex-shrink: 0;
  }

  &__meta {
    display: flex;
    gap: $spacing-sm;
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  &__salary {
    color: #67c23a;
  }

  &__dist {
    font-size: $font-size-xs;
    color: #1989fa;
    font-weight: 500;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 2px;
  }

  &__go {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border: 1px solid rgba($primary-color, 0.4);
    border-radius: $radius-full;
    background: rgba($primary-color, 0.08);
    color: $primary-color;
    font-size: $font-size-xs;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all $transition-base;

    &:hover {
      background: rgba($primary-color, 0.18);
      border-color: $primary-color;
    }
  }
}

.footprint-legend {
  display: flex;
  gap: $spacing-sm;
  font-size: $font-size-xs;
  color: $text-secondary;

  &__item {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
}

.footprint-map {
  width: 100%;
  height: 100%;
  min-height: 70vh;
}

.footprint-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  width: 100%; // ponytail: body 是横向 flex，空态需占满主轴才能整体居中（三个空态共用）
  height: 100%;
  margin: auto; // flex 子项 margin:auto 在主轴+交叉轴都居中，确保垂直也居中
  color: $text-secondary;

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    margin: $spacing-sm 0 0;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-light;
    margin: 0 0 $spacing-sm;
  }
}

.footprint-hint {
  position: absolute;
  bottom: $spacing-md;
  left: 50%;
  transform: translateX(-50%);
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  padding: 4px $spacing-md;
  font-size: $font-size-xs;
  color: $text-secondary;
  backdrop-filter: blur(8px);
  white-space: nowrap;

  &--warn {
    color: $warning-color;
    border-color: rgba($warning-color, 0.3);
  }
}
</style>

<style lang="scss">
// ponytail: marker content 由高德注入外部 DOM，必须放 unscoped 块，scoped 的 data-v 选择器作用不到
@keyframes amap-marker-pulse {
  0% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45), 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  70% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45), 0 0 0 14px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45), 0 0 0 0 rgba(255, 255, 255, 0);
  }
}
</style>
