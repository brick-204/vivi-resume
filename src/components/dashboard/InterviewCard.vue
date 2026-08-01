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
        <span v-else>
          共 {{ interview.rounds.length }} 轮 ·
          {{ latestRoundText }}
        </span>
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
import type { Interview, InterviewStatus, RoundStatus } from '@/types/interview'
import { useResumeStore } from '@/stores/resumeStore'
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

const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  pending: '待面',
  done: '已面',
  passed: '通过',
  failed: '未通过',
}

const statusLabel = computed(() => STATUS_LABEL[props.interview.status])
const statusStyle = computed(() => STATUS_STYLE[props.interview.status])

/** 最近一轮摘要：取 rounds 最后一个，显示「轮次类型 + 状态 + 短日期」 */
const latestRoundText = computed(() => {
  const rounds = props.interview.rounds
  if (rounds.length === 0) return ''
  const last = rounds[rounds.length - 1]
  const type = last.roundType
  const status = ROUND_STATUS_LABEL[last.status]
  const date = last.scheduledAt ? shortDate(last.scheduledAt) : ''
  return `${type} ${status}${date ? ' · ' + date : ''}`
})

const shortDate = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}-${d.getDate().toString().padStart(2, '0')}`
}

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
