<template>
  <div
    class="interview-card"
    :class="{ 'interview-card--selected': selected, 'interview-card--selectable': selectable }"
    @click="selectable ? $emit('toggle-select') : $emit('view')"
  >
    <!-- 多选 checkbox -->
    <div v-if="selectable" class="interview-card__checkbox" @click.stop="$emit('toggle-select')">
      <Icon
        :icon="selected ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline'"
        :width="22"
        :class="{ 'interview-card__checkbox-icon--checked': selected }"
      />
    </div>

    <!-- 状态徽章 -->
    <span class="interview-card__status" :style="{ background: statusStyle.bg, color: statusStyle.color }">
      {{ statusLabel }}
    </span>

    <div class="interview-card__body">
      <!-- 公司 + 岗位 -->
      <div class="interview-card__head">
        <h4 class="interview-card__company">{{ interview.company || '未填写公司' }}</h4>
        <p class="interview-card__position">{{ interview.position || '未填写岗位' }}</p>
      </div>

      <!-- 轮次摘要 -->
      <div class="interview-card__rounds">
        <Icon icon="mdi:format-list-numbered" :width="14" />
        <span v-if="interview.rounds.length === 0">尚未安排轮次</span>
        <span v-else>共 {{ interview.rounds.length }} 轮 · 最后一面 · {{ lastRoundText }}</span>
      </div>

      <!-- 下一面倒计时（仅面试中 + 有未来待面轮次） -->
      <div v-if="nextRound" class="interview-card__countdown" :style="countdownBoxStyle">
        <div class="interview-card__countdown-label" :style="{ color: countdownColors.label }">
          <Icon icon="mdi:timer-sand" :width="14" />
          <span>下一面 · {{ nextRound.roundType }}</span>
          <span v-if="nextScheduledText" class="interview-card__countdown-time">{{ nextScheduledText }}</span>
        </div>
        <div class="interview-card__countdown-value" :style="{ color: countdownColors.value }">{{ countdownText }}</div>
      </div>

      <!-- 关联简历 -->
      <div v-if="resumeTitle" class="interview-card__resume">
        <Icon icon="mdi:file-document-outline" :width="14" />
        <span>{{ resumeTitle }}</span>
      </div>

      <!-- 底部：更新时间 -->
      <div class="interview-card__footer">
        <span class="interview-card__time">
          <Icon icon="mdi:clock-outline" :width="12" />
          {{ relativeTime(interview.updatedAt) }}
        </span>
      </div>
    </div>

    <!-- 操作按钮（hover 显示；多选模式下隐藏） -->
    <div v-if="!selectable" class="interview-card__actions">
      <button class="interview-card__btn interview-card__btn--ai" title="AI 助手" @click.stop="$emit('ai')">
        <Icon icon="mdi:robot-outline" :width="16" />
      </button>
      <button class="interview-card__btn interview-card__btn--copy" title="复制" @click.stop="$emit('copy')">
        <Icon icon="mdi:content-copy" :width="16" />
      </button>
      <button class="interview-card__btn interview-card__btn--delete" title="删除" @click.stop="$emit('delete')">
        <Icon icon="mdi:trash-can-outline" :width="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Interview, InterviewStatus } from '@/types/interview'
import { useResumeStore } from '@/stores/resumeStore'
import { useNextRoundCountdown } from '@/composables/useNextRoundCountdown'
import { formatInterviewDate } from '@/utils/timestamp'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  interview: Interview
  selectable?: boolean
  selected?: boolean
}>()

defineEmits<{
  view: []
  copy: []
  delete: []
  ai: []
  'toggle-select': []
}>()

// ponytail: 内建中文映射，不引入新工具文件
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

const statusLabel = computed(() => STATUS_LABEL[props.interview.status])
const statusStyle = computed(() => STATUS_STYLE[props.interview.status])

/** 最后一轮摘要：「轮次类型 · MM-DD 周X」（无 scheduledAt 则只显示类型） */
const lastRoundText = computed(() => {
  const rounds = props.interview.rounds
  if (rounds.length === 0) return ''
  const last = rounds[rounds.length - 1]
  const dt = formatInterviewDate(last.scheduledAt)
  return dt ? `${last.roundType} · ${dt}` : last.roundType
})

// 关联简历标题
const resumeStore = useResumeStore()
const resumeTitle = computed(() => {
  if (!props.interview.resumeId) return ''
  const r = resumeStore.resumeList.find(r => r.id === props.interview.resumeId)
  return r?.title || ''
})

/** 相对时间：刚刚 / N分钟前 / N小时前 / N天前（仿 ConsultDrawer） */
const relativeTime = (iso: string): string => {
  const ts = new Date(iso).getTime()
  if (isNaN(ts)) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return `${Math.floor(diff / 86_400_000)}天前`
}

// 下一面倒计时：复用 useNextRoundCountdown composable（与面试横幅共享逻辑）
// urgencyLevel 三档色复用横幅同款：soon 蓝 / near 橙 / urgent 红（无脉冲，卡片不打扰）
const { nextRound, countdownText, urgencyLevel } = useNextRoundCountdown(() => props.interview)

/** 下一面具体时刻：MM-DD 周X HH:MM（有 nextRound.scheduledAt 才有值） */
const nextScheduledText = computed(() => formatInterviewDate(nextRound.value?.scheduledAt, true))

const URGENCY_COLORS = {
  soon:   { bg: 'rgba(52, 152, 219, 0.12)', border: 'rgba(52, 152, 219, 0.35)', label: '#3498db', value: '#2980b9' },
  near:   { bg: 'rgba(243, 156, 18, 0.12)', border: 'rgba(243, 156, 18, 0.35)', label: '#f39c12', value: '#e67e22' },
  urgent: { bg: 'rgba(231, 76, 60, 0.14)', border: 'rgba(231, 76, 60, 0.45)',  label: '#e74c3c', value: '#c0392b' },
} as const

// ponytail: 倒计时块背景/边框/文字色随紧迫度动态切；nextRound 为 null 时此块不渲染，故不处理 null
const countdownColors = computed(() => {
  const lvl = urgencyLevel.value
  return lvl ? URGENCY_COLORS[lvl] : URGENCY_COLORS.near
})
const countdownBoxStyle = computed(() => ({
  background: countdownColors.value.bg,
  borderColor: countdownColors.value.border,
}))
</script>

<style lang="scss" scoped>
// 仿 ResumeCard：极细边框 + 圆角 + hover 边框变色 + hover 显示操作按钮
.interview-card {
  position: relative;
  border-radius: $radius-lg;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
  transition: border-color 0.15s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: $primary-color;

    .interview-card__actions {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &--selectable {
    &:hover {
      border-color: $primary-color;
    }
  }

  &--selected {
    border-color: $primary-color;
    box-shadow: 0 0 0 1px $primary-color;
  }

  &__checkbox {
    position: absolute;
    top: $spacing-sm;
    left: $spacing-sm;
    z-index: 2;
    cursor: pointer;
    display: flex;
    align-items: center;
    color: $text-light;

    &-icon--checked {
      color: $primary-color;
    }
  }

  &__status {
    position: absolute;
    top: $spacing-sm;
    right: $spacing-sm;
    padding: 2px $spacing-sm;
    border-radius: $radius-full;
    font-size: $font-size-xs;
    font-weight: 600;
    z-index: 2;
  }

  &__body {
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    flex: 1;
  }

  &__head {
    margin-bottom: $spacing-xs;
  }

  &__company {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 60px; // 给状态徽章留位

    .interview-card--selectable & {
      padding-left: 28px; // 给左上 checkbox 留位
    }
  }

  &__position {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin: 2px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__rounds,
  &__resume {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  // 下一面倒计时：背景/边框/文字色由内联 style 按紧迫度切（soon 蓝/near 橙/urgent 红），此处仅布局
  &__countdown {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
    padding: $spacing-xs $spacing-sm;
    border-radius: $radius-md;
    border: 1px solid transparent;
  }

  &__countdown-label {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px 4px;
    min-width: 0;
    font-size: $font-size-xs;
    font-weight: 600;
  }

  // 具体时刻：占满一行换行展示，与「下一面·轮次」分开
  &__countdown-time {
    width: 100%;
    font-weight: 400;
    opacity: 0.85;
  }

  &__countdown-value {
    flex-shrink: 0;
    font-size: $font-size-sm;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  &__footer {
    margin-top: auto;
    padding-top: $spacing-sm;
  }

  &__time {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: $font-size-xs;
    color: $text-light;
  }

  &__actions {
    position: absolute;
    bottom: $spacing-sm;
    right: $spacing-sm;
    display: flex;
    gap: $spacing-xs;
    opacity: 0;
    transform: translateY(4px);
    transition: all 0.2s ease;
    z-index: 2;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: $radius-sm;
    border: none;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;

    &--ai {
      background: rgba($secondary-color, 0.8);
      color: #fff;

      &:hover { background: rgba($secondary-light, 1); }
      &:active { transform: scale(0.95); }
    }

    &--copy {
      background: rgba($primary-color, 0.8);
      color: #fff;

      &:hover { background: rgba($primary-light, 1); }
      &:active { transform: scale(0.95); }
    }

    &--delete {
      background: rgba($error-color, 0.8);
      color: #fff;

      &:hover { background: rgba($error-color, 1); }
      &:active { transform: scale(0.95); }
    }
  }
}

// 响应式：仅 tablet 断点，无 mobile
@include tablet {
  .interview-card {
    &__body {
      padding: $spacing-md;
    }

    &__company {
      font-size: $font-size-md;
    }
  }
}
</style>
