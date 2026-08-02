<template>
  <div class="interview-detail" ref="rootRef">
    <!-- 顶部 header：返回箭头 + 标题 + 操作按钮 -->
    <div class="interview-detail__header" ref="headerRef">
      <button class="interview-detail__back" :title="mode === 'edit' ? '取消编辑' : '返回'" @click="mode === 'edit' ? $emit('cancel') : $emit('back')">
        <Icon icon="mdi:arrow-left" :width="22" />
      </button>

      <div v-if="interview" class="interview-detail__title">
        <h2 class="interview-detail__company">{{ interview.company || '未填写公司' }}</h2>
        <span class="interview-detail__position">{{ interview.position || '未填写岗位' }}</span>
        <span
          class="interview-detail__status"
          :style="{ background: statusStyle.bg, color: statusStyle.color }"
        >
          {{ statusLabel }}
        </span>
      </div>
      <div v-else class="interview-detail__title">
        <h2 class="interview-detail__company">面试记录</h2>
      </div>

      <div v-if="interview && mode === 'view'" class="interview-detail__actions">
        <button class="action-btn action-btn--primary" @click="$emit('edit')">
          <Icon icon="mdi:pencil-outline" :width="16" />
          编辑
        </button>
        <button class="action-btn action-btn--secondary" @click="$emit('ai')">
          <Icon icon="mdi:robot-outline" :width="16" />
          AI 助手
        </button>
      </div>
      <div v-if="interview && mode === 'edit'" class="interview-detail__actions">
        <button class="action-btn action-btn--primary" @click="handleSave">
          <Icon icon="mdi:check" :width="16" />
          保存
        </button>
        <button class="action-btn action-btn--secondary" @click="$emit('cancel')">
          取消
        </button>
      </div>
    </div>

    <!-- 空状态兜底：interview 不存在/已删除 -->
    <div v-if="!interview" class="interview-detail__empty">
      <div class="empty__icon">
        <Icon icon="mdi:alert-circle-outline" :width="56" />
      </div>
      <p class="empty__text">该面试记录不存在或已删除</p>
      <button class="action-btn action-btn--secondary" @click="$emit('back')">返回列表</button>
    </div>

    <template v-else>
      <!-- 编辑态：就地全屏表单 -->
      <InterviewEditForm
        v-if="mode === 'edit'"
        ref="editFormRef"
        :interview="interview"
        @saved="$emit('saved')"
      />

      <!-- 只读态：四分区展示 -->
      <template v-else>
      <!-- 基本信息区（标签常驻，空值显示占位） -->
      <section class="detail-section">
        <h3 class="detail-section__title">
          <Icon icon="mdi:office-building-outline" :width="16" />
          基本信息
        </h3>
        <div class="detail-section__grid">
          <div class="detail-field">
            <span class="detail-field__label">职位</span>
            <span class="detail-field__value" :class="{ 'is-empty': !interview.position }">{{ interview.position || '未填写' }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">薪资</span>
            <span class="detail-field__value" :class="{ 'is-empty': !interview.salary }">{{ interview.salary || '未填写' }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">工作地点</span>
            <span class="detail-field__value" :class="{ 'is-empty': !interview.location }">{{ interview.location || '未填写' }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">招聘渠道</span>
            <span class="detail-field__value" :class="{ 'is-empty': !interview.channel }">{{ interview.channel || '未填写' }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">关联简历</span>
            <span v-if="resumeTitle" class="detail-field__value detail-field__resume">
              <span class="detail-field__resume-title">{{ resumeTitle }}</span>
              <button
                class="detail-field__resume-btn"
                title="前往编辑该简历"
                @click="goEditResume"
              >
                <Icon icon="mdi:pencil-outline" :width="14" />
                前往编辑
              </button>
            </span>
            <span v-else-if="resumeId" class="detail-field__value is-empty">简历已删除</span>
            <span v-else class="detail-field__value is-empty">未关联</span>
          </div>
        </div>
      </section>

      <!-- JD 区（空也显示占位） -->
      <section class="detail-section">
        <h3 class="detail-section__title">
          <Icon icon="mdi:text-box-outline" :width="16" />
          JD / 职位描述
        </h3>
        <div class="detail-jd" :class="{ 'is-empty': !interview.jd }">{{ interview.jd || '未填写职位描述' }}</div>
      </section>

      <!-- 联系人区（空也显示占位） -->
      <section class="detail-section">
        <h3 class="detail-section__title">
          <Icon icon="mdi:account-circle-outline" :width="16" />
          联系方式
        </h3>
        <div class="detail-section__grid">
          <div class="detail-field">
            <span class="detail-field__label">联系人</span>
            <span class="detail-field__value" :class="{ 'is-empty': !interview.contactName }">{{ interview.contactName || '未填写' }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">联系方式</span>
            <span class="detail-field__value" :class="{ 'is-empty': !interview.contactInfo }">{{ interview.contactInfo || '未填写' }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">面试地点</span>
            <span class="detail-field__value" :class="{ 'is-empty': !interview.interviewLocation }">{{ interview.interviewLocation || '未填写' }}</span>
          </div>
        </div>
      </section>

      <!-- 轮次时间线 -->
      <section class="detail-section">
        <h3 class="detail-section__title">
          <Icon icon="mdi:format-list-numbered" :width="16" />
          面试轮次
          <span v-if="interview.rounds.length > 0" class="detail-section__count">{{ interview.rounds.length }}</span>
        </h3>

        <div v-if="interview.rounds.length === 0" class="detail-empty">尚未安排面试轮次</div>

        <div v-else class="timeline">
          <div v-for="(r, i) in interview.rounds" :key="r.id" class="timeline__item">
            <div class="timeline__node">
              <span class="timeline__node-dot" :class="`timeline__node-dot--${r.status}`"></span>
              <span v-if="i < interview.rounds.length - 1" class="timeline__node-line"></span>
            </div>

            <div class="timeline__card">
              <div class="timeline__card-head">
                <span class="timeline__round-type">第 {{ i + 1 }} 轮 · {{ r.roundType }}</span>
                <span class="timeline__round-status" :class="`timeline__round-status--${r.status}`">
                  {{ roundStatusLabel(r.status) }}
                </span>
              </div>

              <div class="timeline__card-grid">
                <div class="detail-field">
                  <span class="detail-field__label">面试时间</span>
                  <span class="detail-field__value" :class="{ 'is-empty': !r.scheduledAt }">{{ r.scheduledAt ? formatDateTime(r.scheduledAt) : '未安排' }}</span>
                </div>
                <div class="detail-field">
                  <span class="detail-field__label">形式</span>
                  <span class="detail-field__value" :class="{ 'is-empty': !r.format }">{{ r.format ? formatLabel(r.format) : '未选择' }}</span>
                </div>
                <div class="detail-field">
                  <span class="detail-field__label">面试官</span>
                  <span class="detail-field__value" :class="{ 'is-empty': !r.interviewer }">{{ r.interviewer || '未填写' }}</span>
                </div>
                <div class="detail-field">
                  <span class="detail-field__label">面试链接</span>
                  <a
                    v-if="r.meetingLink"
                    :href="r.meetingLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="detail-field__link"
                  >
                    <Icon icon="mdi:link-variant" :width="14" />
                    <span class="detail-field__link-text">{{ r.meetingLink }}</span>
                    <Icon icon="mdi:open-in-new" :width="12" />
                  </a>
                  <span v-else class="detail-field__value is-empty">未填写</span>
                </div>
              </div>

              <div class="timeline__text-block">
                <span class="timeline__text-label">面试问题</span>
                <p class="timeline__text-content" :class="{ 'is-empty': !r.questions }">{{ r.questions || '未记录' }}</p>
              </div>
              <div class="timeline__text-block">
                <span class="timeline__text-label">回答记录</span>
                <p class="timeline__text-content" :class="{ 'is-empty': !r.answers }">{{ r.answers || '未记录' }}</p>
              </div>
              <div class="timeline__text-block">
                <span class="timeline__text-label">备注</span>
                <p class="timeline__text-content" :class="{ 'is-empty': !r.notes }">{{ r.notes || '无' }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { Interview, InterviewStatus, RoundStatus, InterviewFormat } from '@/types/interview'
import { useResumeStore } from '@/stores/resumeStore'
import { dialog } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import InterviewEditForm from './InterviewEditForm.vue'

const props = withDefaults(defineProps<{
  interview: Interview | null
  mode?: 'view' | 'edit'
}>(), { mode: 'view' })

const emit = defineEmits<{
  back: []
  edit: []
  ai: []
  saved: []
  cancel: []
}>()

// 编辑表单引用（edit 态由 header 保存按钮触发 save）
const editFormRef = ref<InstanceType<typeof InterviewEditForm> | null>(null)

// ponytail: 测量 header 实际高度写入 CSS 变量，供编辑态轮次标题 sticky 偏移使用（header 可能 wrap，高度不固定）
const rootRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const syncHeaderHeight = () => {
  const h = headerRef.value?.offsetHeight ?? 0
  if (rootRef.value) rootRef.value.style.setProperty('--detail-header-h', `${h}px`)
}

onMounted(() => {
  syncHeaderHeight()
  if (headerRef.value) {
    resizeObserver = new ResizeObserver(syncHeaderHeight)
    resizeObserver.observe(headerRef.value)
  }
})
onUnmounted(() => { resizeObserver?.disconnect() })
// mode/interview 变化后 header 内容可能变（如空态），下一帧重测
watch([() => props.mode, () => props.interview], () => nextTick(syncHeaderHeight))

function handleSave() {
  // 校验未过（公司名空）时 editForm 内部已提示，不退出编辑态
  if (editFormRef.value?.save()) {
    emit('saved')
  }
}

// ponytail: 复用 InterviewCard 的中文映射，保持详情与卡片视觉一致
const STATUS_LABEL: Record<InterviewStatus, string> = {
  drafting: '草稿',
  submitted: '已投递',
  interviewing: '面试中',
  offer: 'Offer',
  rejected: '未通过',
  closed: '已结束',
}

const STATUS_STYLE: Record<InterviewStatus, { bg: string; color: string }> = {
  drafting: { bg: 'rgba(120, 120, 120, 0.15)', color: '#999' },
  submitted: { bg: 'rgba(52, 152, 219, 0.15)', color: '#3498db' },
  interviewing: { bg: 'rgba(243, 156, 18, 0.15)', color: '#f39c12' },
  offer: { bg: 'rgba(39, 174, 96, 0.15)', color: '#27ae60' },
  rejected: { bg: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c' },
  closed: { bg: 'rgba(120, 120, 120, 0.15)', color: '#999' },
}

const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  pending: '待面',
  done: '已面',
  passed: '通过',
  failed: '未通过',
}

const FORMAT_LABEL: Record<InterviewFormat, string> = {
  onsite: '现场',
  video: '视频',
  phone: '电话',
}

const statusLabel = computed(() => (props.interview ? STATUS_LABEL[props.interview.status] : ''))
const statusStyle = computed(() =>
  props.interview ? STATUS_STYLE[props.interview.status] : { bg: '', color: '' },
)

const roundStatusLabel = (s: RoundStatus) => ROUND_STATUS_LABEL[s]
const formatLabel = (f: InterviewFormat) => FORMAT_LABEL[f]

// 关联简历标题
const router = useRouter()
const resumeStore = useResumeStore()
const resumeId = computed(() => props.interview?.resumeId)
const resumeTitle = computed(() => {
  const rid = resumeId.value
  if (!rid) return ''
  const r = resumeStore.resumeList.find(r => r.id === rid)
  return r?.title || ''
})

function goEditResume() {
  const rid = resumeId.value
  if (!rid) return
  // ponytail: 跳转会离开面试详情页，按项目弹窗规范用离散 dialog 确认（操作按钮在左、取消在右）
  dialog.warning({
    title: '前往编辑简历',
    content: '将离开当前面试记录，前往该简历的编辑页面。是否继续？',
    positiveText: '前往编辑',
    negativeText: '取消',
    actionStyle: 'flex-direction: row-reverse; justify-content: center; gap: 12px !important;',
    onPositiveClick: () => {
      router.push(`/editor/${rid}`)
    },
  })
}

const formatDateTime = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style lang="scss" scoped>
.interview-detail {
  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    // ponytail: sticky 吸顶——滚动容器为外层 .dashboard__content，top:0 贴其顶。
    // 背景与 .dashboard__content 同色（$bg-secondary），吸顶时与两侧 padding 区融为一体
    position: sticky;
    top: 0;
    margin-bottom: $spacing-xl;
    padding: $spacing-md 0;
    background: $bg-secondary;
    border-bottom: 1px solid var(--border-color);
    z-index: 10;
    flex-wrap: wrap;
  }

  &__back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: $radius-lg;
    border: 1px solid $border-glass;
    background: $bg-glass;
    color: $text-primary;
    cursor: pointer;
    transition: all $transition-base;

    &:hover {
      background: $bg-glass-hover;
      border-color: $primary-color;
      color: $primary-color;
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
  }

  &__company {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $text-primary;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }

  &__position {
    font-size: $font-size-md;
    color: $text-secondary;
  }

  &__status {
    padding: 2px $spacing-sm;
    border-radius: $radius-full;
    font-size: $font-size-xs;
    font-weight: 600;
    flex-shrink: 0;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
    flex-shrink: 0;
  }

  &__empty {
    text-align: center;
    padding: $spacing-3xl 0;
  }
}

.detail-section {
  // ponytail: 卡片制——实心背景浮于面板背景 + 边框 + 圆角，遵循项目无阴影设计语言（_theme.scss 注释）
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  padding: $spacing-lg $spacing-xl;
  margin-bottom: $spacing-xl;

  &:last-child {
    margin-bottom: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: 700;
    color: $text-primary;
    margin: 0 0 $spacing-md;
    padding-bottom: $spacing-sm;
    border-bottom: 1px solid var(--border-color);
    letter-spacing: 0.02em;
  }

  &__count {
    padding: 1px $spacing-sm;
    background: $bg-glass;
    color: $text-secondary;
    border-radius: $radius-full;
    font-size: $font-size-xs;
    font-weight: 600;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: $spacing-md $spacing-xl;
  }
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  &__label {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
    letter-spacing: 0.03em;
  }

  &__value {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    word-break: break-word;
    line-height: 1.5;

    // ponytail: 空值占位——灰斜体 + 半透明，更"虚"不抢眼
    &.is-empty {
      color: $text-light;
      font-weight: 400;
      font-style: italic;
      opacity: 0.5;
    }
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: $font-size-md;
    font-weight: 500;
    color: $primary-color;
    max-width: 100%;
    text-decoration: none;
    transition: opacity $transition-base;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    // ponytail: 链接文本超长时省略，外链图标常驻
    &-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
  }

  &__resume {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-wrap: wrap;
  }

  &__resume-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__resume-btn {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    flex-shrink: 0;
    padding: 2px $spacing-sm;
    border-radius: $radius-md;
    font-size: $font-size-xs;
    font-weight: 600;
    color: $primary-color;
    background: rgba($primary-color, 0.12);
    border: 1px solid rgba($primary-color, 0.3);
    cursor: pointer;
    transition: all $transition-base;
    font-family: $font-family;

    &:hover {
      background: rgba($primary-color, 0.2);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

.detail-jd {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  // ponytail: 卡片内嵌块——去掉背景避免卡片套卡片，用左侧色条强调
  border-left: 3px solid var(--border-bold);
  border-radius: 0 $radius-sm $radius-sm 0;
  padding: $spacing-xs $spacing-lg;

  &.is-empty {
    color: $text-light;
    font-style: italic;
    opacity: 0.5;
  }
}

.detail-empty {
  font-size: $font-size-sm;
  color: $text-light;
  padding: $spacing-lg 0;
}

// 轮次时间线
.timeline {
  display: flex;
  flex-direction: column;
}

.timeline__item {
  display: flex;
  gap: $spacing-md;
}

.timeline__node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 14px;
}

.timeline__node-dot {
  width: 12px;
  height: 12px;
  border-radius: $radius-full;
  margin-top: 4px;
  background: $text-light;
  flex-shrink: 0;
  z-index: 1;

  &--pending { background: #999; }
  &--done { background: #3498db; }
  &--passed { background: #27ae60; }
  &--failed { background: #e74c3c; }
}

.timeline__node-line {
  flex: 1;
  width: 2px;
  background: $border-glass;
  margin-top: 2px;
  min-height: 16px;
}

.timeline__card {
  // ponytail: 外层 section 已是卡片，轮次卡用次级背景内嵌，避免卡片套卡片
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  padding: $spacing-lg $spacing-xl;
  background: var(--bg-secondary);
  margin-bottom: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.timeline__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.timeline__round-type {
  font-size: $font-size-md;
  font-weight: 700;
  color: $text-primary;
}

.timeline__round-status {
  padding: 1px $spacing-sm;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 600;

  &--pending { background: rgba(120, 120, 120, 0.15); color: #999; }
  &--done { background: rgba(52, 152, 219, 0.15); color: #3498db; }
  &--passed { background: rgba(39, 174, 96, 0.15); color: #27ae60; }
  &--failed { background: rgba(231, 76, 60, 0.15); color: #e74c3c; }
}

.timeline__card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: $spacing-sm $spacing-lg;
}

.timeline__text-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline__text-label {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $text-secondary;
  letter-spacing: 0.03em;
}

.timeline__text-content {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;

  &.is-empty {
    color: $text-light;
    font-weight: 400;
    font-style: italic;
    opacity: 0.5;
  }
}

.empty__icon {
  margin-bottom: $spacing-md;
  color: $text-light;
  opacity: 0.5;
}

.empty__text {
  font-size: $font-size-md;
  color: $text-light;
  margin: 0 0 $spacing-lg;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: none;
  font-family: $font-family;

  &--primary {
    background: $primary-color;
    color: $text-white;

    &:hover { background: $primary-light; }
  }

  &--secondary {
    background: $bg-glass;
    color: $text-primary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
      border-color: $primary-color;
    }
  }

  &--danger {
    background: rgba($error-color, 0.12);
    color: $error-color;
    border: 1px solid rgba($error-color, 0.3);

    &:hover {
      background: rgba($error-color, 0.2);
    }
  }

  &:active { transform: scale(0.97); }
}

// 响应式：仅 tablet，无 mobile
@include tablet {
  .detail-section__grid,
  .timeline__card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
