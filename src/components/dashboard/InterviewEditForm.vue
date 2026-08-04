<template>
  <div class="interview-edit-form" ref="rootRef">
    <!-- 公司信息区 -->
    <div class="form-section">
      <div class="form-section__title form-section__title--collapsible" @click="companyCollapsed = !companyCollapsed">
        <Icon icon="mdi:office-building-outline" :width="16" />
        <span>公司信息</span>
        <span v-if="companyCollapsed" class="form-section__summary">{{ companySummary }}</span>
        <Icon
          class="form-section__chevron"
          :class="{ 'form-section__chevron--collapsed': companyCollapsed }"
          icon="mdi:chevron-down"
          :width="18"
        />
      </div>

      <div v-show="!companyCollapsed" class="form-grid">
        <div class="form-field">
          <label>公司 <span class="form-field__required">*</span></label>
          <n-input
            :value="form.company"
            placeholder="必填"
            @update:value="onFieldUpdate('company', $event)"
          />
        </div>

        <div class="form-field">
          <label>职位</label>
          <n-input
            :value="form.position"
            placeholder="如：前端工程师"
            @update:value="onFieldUpdate('position', $event)"
          />
        </div>

        <div class="form-field">
          <label>状态</label>
          <n-select
            :value="form.status"
            :options="statusOptions"
            @update:value="(v: string | null) => onFieldUpdate('status', v as InterviewStatus)"
          />
        </div>

        <div class="form-field">
          <label>薪资</label>
          <n-input
            :value="form.salary"
            placeholder="如：20-30k·14薪"
            @update:value="onFieldUpdate('salary', $event)"
          />
        </div>

        <div class="form-field">
          <label>
            面试地点
            <NTooltip placement="top" :style="{ maxWidth: '280px' }">
              <template #trigger>
                <Icon icon="mdi:information-outline" :width="14" class="field-tip-icon" />
              </template>
              <div style="line-height:1.6;">
                · 点放大镜用 POI 搜索选地点：消耗基础搜索服务额度<br>
                · 手输地址在「面试足迹」会调地理编码转坐标，消耗地理编码额度；成功后缓存，每条地址仅消耗一次
              </div>
            </NTooltip>
            <span v-if="form.interviewLocationPoiSelected" class="poi-tag" title="经 POI 搜索定位">
              <Icon icon="mdi:check-circle" :width="13" />
              已定位
            </span>
          </label>
          <div class="field-with-action">
            <n-input
              :value="form.interviewLocation"
              placeholder="如：XX 大厦 12 楼"
              @update:value="onFieldUpdate('interviewLocation', $event)"
            />
            <NButton
              quaternary
              :title="mapAvailable ? '搜索定位' : '地图功能未启用，点击去设置'"
              class="field-with-action__btn"
              @click="openPoiSearch('interviewLocation')"
            >
              <Icon icon="mdi:map-search-outline" :width="18" />
            </NButton>
          </div>
        </div>

        <div class="form-field">
          <label>
            工作地点
            <NTooltip placement="top" :style="{ maxWidth: '280px' }">
              <template #trigger>
                <Icon icon="mdi:information-outline" :width="14" class="field-tip-icon" />
              </template>
              <div style="line-height:1.6;">
                · 点放大镜用 POI 搜索选地点：消耗基础搜索服务额度<br>
                · 手输地址在「面试足迹」会调地理编码转坐标，消耗地理编码额度；成功后缓存，每条地址仅消耗一次
              </div>
            </NTooltip>
            <span v-if="form.locationPoiSelected" class="poi-tag" title="经 POI 搜索定位">
              <Icon icon="mdi:check-circle" :width="13" />
              已定位
            </span>
          </label>
          <div class="field-with-action">
            <n-input
              :value="form.location"
              placeholder="如：上海"
              :disabled="locationSameAsInterview"
              @update:value="onFieldUpdate('location', $event)"
            />
            <NButton
              quaternary
              :title="locationSameAsInterview ? '已同步面试地点' : (mapAvailable ? '搜索定位' : '地图功能未启用，点击去设置')"
              class="field-with-action__btn"
              :disabled="locationSameAsInterview"
              @click="openPoiSearch('location')"
            >
              <Icon icon="mdi:map-search-outline" :width="18" />
            </NButton>
          </div>
          <NCheckbox
            :checked="locationSameAsInterview"
            size="small"
            class="field-same-checkbox"
            @update:checked="onToggleLocationSame"
          >
            同面试地点（勾选后工作地点自动同步面试地点）
          </NCheckbox>
        </div>

        <PoiSearchModal
          :visible="poiModalVisible"
          @close="poiModalVisible = false"
          @select="onPoiSelect"
        />

        <div class="form-field">
          <label>招聘渠道</label>
          <n-select
            :value="form.channel"
            :options="channelOptions"
            filterable
            tag
            placeholder="选择或输入"
            @update:value="(v: string | null) => onFieldUpdate('channel', v ?? '')"
          />
        </div>

        <div class="form-field">
          <label>联系人</label>
          <n-input
            :value="form.contactName"
            placeholder="HR 姓名"
            @update:value="onFieldUpdate('contactName', $event)"
          />
        </div>

        <div class="form-field">
          <label>联系方式</label>
          <n-input
            :value="form.contactInfo"
            placeholder="电话 / 邮箱 / 微信"
            @update:value="onFieldUpdate('contactInfo', $event)"
          />
        </div>

        <div class="form-field form-field--full">
          <label>关联简历</label>
          <n-select
            :value="form.resumeId"
            :options="resumeOptions"
            clearable
            placeholder="可选"
            @update:value="(v: string | null) => onFieldUpdate('resumeId', v)"
          />
        </div>

        <div class="form-field form-field--full">
          <label>福利待遇</label>
          <n-input
            :value="form.benefits"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 6 }"
            placeholder="如 13薪 / 补充医疗 / 免费三餐 / 弹性工时"
            @update:value="onFieldUpdate('benefits', $event)"
          />
        </div>

        <div class="form-field form-field--full">
          <label>JD / 职位描述</label>
          <n-input
            :value="form.jd"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            placeholder="粘贴 JD，便于面试准备"
            @update:value="onFieldUpdate('jd', $event)"
          />
        </div>
      </div>
    </div>

    <!-- 轮次区 -->
    <div class="form-section">
      <div class="form-section__title form-section__title--sticky">
        <Icon icon="mdi:format-list-numbered" :width="16" />
        <span>面试轮次</span>
        <n-button size="small" quaternary class="form-section__action" @click="addRound">
          <template #icon>
            <Icon icon="mdi:plus" :width="16" />
          </template>
          添加轮次
        </n-button>
      </div>

      <div v-if="form.rounds.length === 0" class="form-empty">
        还没有面试轮次，点击「添加轮次」开始记录
      </div>

      <!-- ponytail: class 直接挂 draggable——它渲染为 flex 容器，gap 作用于内部轮次卡 -->
      <draggable
        v-model="sortableRounds"
        class="form-rounds"
        item-key="id"
        handle=".round-editor__drag"
        :animation="200"
        ghost-class="round-editor--ghost"
        :scroll="scrollContainer"
        :scroll-sensitivity="80"
        :scroll-speed="10"
      >
        <template #item="{ element: r, index: i }">
          <InterviewRoundEditor
            :round="r"
            :index="i"
            @update:round="onRoundUpdate(i, $event)"
            @remove="onRoundRemove(i)"
            @duplicate="onRoundDuplicate(i)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { NInput, NSelect, NButton, NCheckbox, NTooltip } from 'naive-ui'
import draggable from 'vuedraggable'
import type { SelectOption } from 'naive-ui'
import type { Interview, InterviewStatus } from '@/types/interview'
import { createEmptyRound } from '@/types/interview'
import { generateId } from '@/types/resume'
import { useInterviewStore } from '@/stores/interviewStore'
import { useResumeStore } from '@/stores/resumeStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRouter } from 'vue-router'
import { message as naiveMessage, dialog } from '@/plugins/naive-ui'
import InterviewRoundEditor from './InterviewRoundEditor.vue'
import PoiSearchModal from './PoiSearchModal.vue'
import type { PoiResult } from '@/services/amapService'

const props = defineProps<{ interview: Interview }>()

const emit = defineEmits<{
  saved: []
}>()

const interviewStore = useInterviewStore()
const resumeStore = useResumeStore()
const settingsStore = useSettingsStore()
const router = useRouter()

// 地图功能可用：开关开 + Key 已配置
const mapAvailable = computed(() => settingsStore.amapEnabled && !!settingsStore.amapKey)

// ponytail: 本地可变副本，避免每次输入触发 store 防抖；保存时一次性写回
const form = ref<Interview>(JSON.parse(JSON.stringify(props.interview)) as Interview)

// 公司信息折叠态（默认展开）；折叠时标题栏显示一行摘要
const companyCollapsed = ref(false)
// 高德 POI 搜索弹窗显隐 + 当前编辑目标（'interviewLocation' | 'location'）
const poiModalVisible = ref(false)
const poiTarget = ref<'interviewLocation' | 'location'>('interviewLocation')
// 工作地点是否同面试地点（勾选后工作地点同步面试地点的地址+经纬度，且禁用编辑）
// 状态持久化在 interview.locationSameAsInterview，保存时跟着落盘
const locationSameAsInterview = ref(!!form.value.locationSameAsInterview)
const companySummary = computed(() => {
  const parts = [
    form.value.company || '未命名',
    form.value.position,
    statusOptions.find(o => o.value === form.value.status)?.label,
  ].filter(Boolean)
  return parts.join(' · ')
})

const statusOptions: SelectOption[] = [
  { label: '准备中', value: 'drafting' },
  { label: '已投递', value: 'submitted' },
  { label: '面试中', value: 'interviewing' },
  { label: 'Offer', value: 'offer' },
  { label: '未通过', value: 'rejected' },
  { label: '已关闭', value: 'closed' },
]

const channelOptions: SelectOption[] = [
  { label: 'Boss 直聘', value: 'Boss 直聘' },
  { label: '拉勾', value: '拉勾' },
  { label: '猎聘', value: '猎聘' },
  { label: '智联招聘', value: '智联招聘' },
  { label: '前程无忧', value: '前程无忧' },
  { label: '内推', value: '内推' },
  { label: '官网', value: '官网' },
  { label: '猎头', value: '猎头' },
]

const resumeOptions = computed(() =>
  resumeStore.resumeList.map(r => ({
    label: r.title || '未命名简历',
    value: r.id,
  })),
)

// ponytail: draggable v-model 双向绑定——get 透传 form.rounds，set 拖拽后整体写回
const sortableRounds = computed({
  get: () => form.value.rounds,
  set: (rounds) => { form.value = { ...form.value, rounds } },
})

// ponytail: 拖拽自动滚动——向上 closest 找到外层滚动容器 .dashboard__content 传给 SortableJS
const rootRef = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | undefined>(undefined)
onMounted(() => {
  scrollContainer.value = rootRef.value?.closest('.dashboard__content') ?? undefined
})

function onFieldUpdate<K extends keyof Interview>(key: K, value: Interview[K]) {
  const next = { ...form.value, [key]: value }
  // 手输改地址 → 该地点不再是 POI 选的，清标记 + 经纬度 + 失败标记（地址变了，重新试 geocode）
  if (key === 'interviewLocation') {
    next.interviewLocationPoiSelected = false
    next.interviewLocationLng = undefined
    next.interviewLocationLat = undefined
    next.interviewLocationGeocodeFailed = false
  }
  if (key === 'location') {
    next.locationPoiSelected = false
    next.locationLng = undefined
    next.locationLat = undefined
    next.locationGeocodeFailed = false
  }
  // 面试地点变化时，若勾选了「同面试地点」，工作地点跟着同步（地址+经纬度+POI 标记+失败标记）
  if (key === 'interviewLocation' && locationSameAsInterview.value) {
    next.location = value as string
    next.locationLng = next.interviewLocationLng
    next.locationLat = next.interviewLocationLat
    next.locationPoiSelected = next.interviewLocationPoiSelected
    next.locationGeocodeFailed = next.interviewLocationGeocodeFailed
  }
  form.value = next
}

/** 打开 POI 搜索弹窗，记录当前编辑目标；地图功能未启用时弹提示并提供跳设置入口 */
function openPoiSearch(target: 'interviewLocation' | 'location') {
  if (target === 'location' && locationSameAsInterview.value) return
  // 地图功能未启用或未配 Key → 弹提示 + 跳设置入口（不打开搜索弹窗）
  if (!mapAvailable.value) {
    dialog.warning({
      title: '地图功能未启用',
      content: '地点搜索依赖高德地图。请先在「设置 → 地图设置」中开启地图功能并填写高德地图 Key。',
      positiveText: '去设置',
      negativeText: '取消',
      actionStyle: 'flex-direction: row-reverse; justify-content: center; gap: 12px !important;',
      onPositiveClick: () => {
        router.push({ query: { tab: 'settings' } })
      },
    })
    return
  }
  poiTarget.value = target
  poiModalVisible.value = true
}

/** POI 选中：按 target 写回对应字段的地址+经纬度+POI 标记（清失败标记）；勾选同面试地点时工作地点一并同步 */
function onPoiSelect(poi: PoiResult) {
  const next = { ...form.value }
  if (poiTarget.value === 'interviewLocation') {
    next.interviewLocation = poi.name
    next.interviewLocationLng = poi.lng
    next.interviewLocationLat = poi.lat
    next.interviewLocationPoiSelected = true
    next.interviewLocationGeocodeFailed = false
    if (locationSameAsInterview.value) {
      next.location = poi.name
      next.locationLng = poi.lng
      next.locationLat = poi.lat
      next.locationPoiSelected = true
      next.locationGeocodeFailed = false
    }
  } else {
    next.location = poi.name
    next.locationLng = poi.lng
    next.locationLat = poi.lat
    next.locationPoiSelected = true
    next.locationGeocodeFailed = false
  }
  form.value = next
  naiveMessage.success(`已定位：${poi.name}`)
}

/** 切换「工作地点同面试地点」勾选：勾选时同步当前面试地点值 */
function onToggleLocationSame(checked: boolean) {
  locationSameAsInterview.value = checked
  const next: Interview = { ...form.value, locationSameAsInterview: checked }
  if (checked) {
    next.location = form.value.interviewLocation
    next.locationLng = form.value.interviewLocationLng
    next.locationLat = form.value.interviewLocationLat
    next.locationPoiSelected = form.value.interviewLocationPoiSelected
    next.locationGeocodeFailed = form.value.interviewLocationGeocodeFailed
  }
  form.value = next
}

function addRound() {
  form.value = { ...form.value, rounds: [...form.value.rounds, createEmptyRound()] }
}

function onRoundUpdate(index: number, round: Interview['rounds'][number]) {
  const rounds = form.value.rounds.slice()
  rounds[index] = round
  form.value = { ...form.value, rounds }
}

function onRoundRemove(index: number) {
  const round = form.value.rounds[index]
  dialog.warning({
    title: '删除面试轮次',
    content: `确定要删除「第 ${index + 1} 轮 · ${round.roundType || '未命名轮次'}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    actionStyle: 'flex-direction: row-reverse; justify-content: center; gap: 12px !important;',
    onPositiveClick: () => {
      const rounds = form.value.rounds.filter((_, i) => i !== index)
      form.value = { ...form.value, rounds }
    },
  })
}

function onRoundDuplicate(index: number) {
  // ponytail: 深拷贝该轮 + 新 id + 重置时间戳，插到原轮后面（复制插其后更直觉）
  const now = new Date().toISOString()
  const copy: Interview['rounds'][number] = {
    ...JSON.parse(JSON.stringify(form.value.rounds[index])),
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  const rounds = form.value.rounds.slice()
  rounds.splice(index + 1, 0, copy)
  form.value = { ...form.value, rounds }
  naiveMessage.success('已复制轮次')
}

// 暴露给父组件（InterviewDetail edit header 的保存按钮）触发
function save() {
  if (!form.value.company.trim()) {
    naiveMessage.warning('请填写公司名称')
    return false
  }
  interviewStore.updateInterview(form.value)
  emit('saved')
  return true
}

/** 表单是否有未保存改动（对比 form 与初始 interview，纯 JSON 比对） */
function isDirty(): boolean {
  return JSON.stringify(form.value) !== JSON.stringify(props.interview)
}

defineExpose({ save, isDirty })
</script>

<style lang="scss" scoped>
.form-section {
  // ponytail: 对齐只读态 .detail-section——实色卡片浮于面板背景，避免编辑态文字透底发虚
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  padding: $spacing-lg $spacing-xl;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  margin-bottom: $spacing-md;

  &:last-child {
    margin-bottom: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-weight: 600;
    font-size: $font-size-sm;
    color: $text-secondary;

    &--collapsible {
      cursor: pointer;
      user-select: none;

      &:hover {
        color: $text-primary;
      }
    }
  }

  &__summary {
    margin-left: $spacing-xs;
    font-weight: 400;
    font-size: $font-size-xs;
    color: $text-light;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chevron {
    margin-left: auto;
    color: $text-light;
    transition: transform $transition-base;

    &--collapsed {
      transform: rotate(-90deg);
    }
  }

  &__action {
    margin-left: auto;
  }

  // ponytail: 轮次标题吸顶——top 跟随 InterviewDetail header 高度（--detail-header-h 由父级测量写入）。
  // 负 margin + 等宽 padding 拉满卡片宽度，实色背景覆盖下方滚上来的内容，底部 border 分隔
  &__title--sticky {
    position: sticky;
    top: var(--detail-header-h, 0px);
    z-index: 5;
    margin: (-$spacing-lg) (-$spacing-xl) 0;
    padding: $spacing-lg $spacing-xl;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;

  @include tablet {
    grid-template-columns: 1fr;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--full {
    grid-column: 1 / -1;
  }

  label {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
  }

  &__required {
    color: $error-color;
  }
}

.field-with-action {
  display: flex;
  gap: 4px;
  align-items: stretch;

  &__btn {
    flex-shrink: 0;
  }
}

.field-same-checkbox {
  margin-top: 6px;
  font-weight: 400;
  font-size: 12px;
}

.poi-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #67c23a;
  background: rgba(103, 194, 58, 0.12);
}

.field-tip-icon {
  margin-left: 4px;
  color: $text-light;
  cursor: help;
  vertical-align: middle;

  &:hover {
    color: $primary-color;
  }
}

// ponytail: Outfit 可变字体 weight 400 笔画偏细，与中文回退字体粗细不一致致发虚；
// 编辑表单内输入框正文提到 600 对齐视觉粗细（方案 C：更实，仅作用于面试编辑页）
:deep(.n-input .n-input__input-el),
:deep(.n-input .n-input__textarea-el) {
  font-weight: 600;
}

.form-empty {
  padding: $spacing-lg;
  text-align: center;
  font-size: $font-size-sm;
  color: $text-light;
  border: 1px dashed $border-glass;
  border-radius: $radius-md;
}

.form-rounds {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
