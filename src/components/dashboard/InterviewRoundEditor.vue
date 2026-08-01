<template>
  <div class="round-editor">
    <div class="round-editor__header" @click="collapsed = !collapsed">
      <Icon
        class="round-editor__chevron"
        :class="{ 'round-editor__chevron--collapsed': collapsed }"
        icon="mdi:chevron-down"
        :width="18"
      />
      <span class="round-editor__title">第 {{ index + 1 }} 轮 · {{ roundTypeLabel }}</span>
      <span v-if="collapsed" class="round-editor__summary">{{ roundSummary }}</span>
      <n-button
        quaternary
        size="tiny"
        class="round-editor__remove"
        @click.stop="emit('remove')"
      >
        <template #icon>
          <Icon icon="mdi:trash-can-outline" :width="16" />
        </template>
      </n-button>
    </div>

    <div v-show="!collapsed" class="round-editor__body">
    <div class="round-editor__grid">
      <div class="round-editor__field">
        <label>轮次类型</label>
        <n-select
          :value="round.roundType"
          :options="roundTypeOptions"
          size="small"
          @update:value="(v: string | null) => onFieldUpdate('roundType', v as RoundType)"
        />
      </div>

      <div class="round-editor__field">
        <label>面试时间</label>
        <n-date-picker
          :value="scheduledAtTs"
          type="datetime"
          size="small"
          clearable
          @update:value="onScheduledAtUpdate"
        />
      </div>

      <div class="round-editor__field">
        <label>状态</label>
        <n-select
          :value="round.status"
          :options="roundStatusOptions"
          size="small"
          @update:value="(v: string | null) => onFieldUpdate('status', v as RoundStatus)"
        />
      </div>

      <div class="round-editor__field">
        <label>形式</label>
        <n-select
          :value="round.format"
          :options="formatOptions"
          size="small"
          clearable
          @update:value="(v: string | null) => onFieldUpdate('format', v as InterviewFormat | null)"
        />
      </div>

      <div class="round-editor__field">
        <label>面试官</label>
        <n-input
          :value="round.interviewer"
          size="small"
          placeholder="姓名 / 职务"
          @update:value="onFieldUpdate('interviewer', $event)"
        />
      </div>

      <div class="round-editor__field">
        <label>结果</label>
        <n-input
          :value="round.result"
          size="small"
          placeholder="如：通过 / 待定"
          @update:value="onFieldUpdate('result', $event)"
        />
      </div>
    </div>

    <div class="round-editor__field round-editor__field--full">
      <label>面试问题</label>
      <n-input
        :value="round.questions"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        placeholder="记录面试官提问"
        @update:value="onFieldUpdate('questions', $event)"
      />
    </div>

    <div class="round-editor__field round-editor__field--full">
      <label>回答记录</label>
      <n-input
        :value="round.answers"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        placeholder="记录自己的回答"
        @update:value="onFieldUpdate('answers', $event)"
      />
    </div>

    <div class="round-editor__field round-editor__field--full">
      <label>备注</label>
      <n-input
        :value="round.notes"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 4 }"
        placeholder="其他备注"
        @update:value="onFieldUpdate('notes', $event)"
      />
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { NSelect, NDatePicker, NInput, NButton } from 'naive-ui'
import type { InterviewRound, RoundType, RoundStatus, InterviewFormat } from '@/types/interview'

const props = defineProps<{
  round: InterviewRound
  index: number
}>()

const emit = defineEmits<{
  'update:round': [round: InterviewRound]
  remove: []
}>()

const roundTypeOptions: { label: string; value: RoundType }[] = [
  { label: '一面', value: 'first' },
  { label: '二面', value: 'second' },
  { label: 'HR 面', value: 'hr' },
  { label: '终面', value: 'final' },
  { label: '其他', value: 'other' },
]

const roundStatusOptions: { label: string; value: RoundStatus }[] = [
  { label: '待面', value: 'pending' },
  { label: '已面', value: 'done' },
  { label: '通过', value: 'passed' },
  { label: '未通过', value: 'failed' },
]

const formatOptions: { label: string; value: InterviewFormat }[] = [
  { label: '现场', value: 'onsite' },
  { label: '视频', value: 'video' },
  { label: '电话', value: 'phone' },
]

const roundTypeLabel = computed(() => {
  return roundTypeOptions.find(o => o.value === props.round.roundType)?.label ?? '其他'
})

// 每轮折叠态（默认展开）；折叠时 header 显示一行摘要
const collapsed = ref(false)
const roundSummary = computed(() => {
  const parts: string[] = []
  if (props.round.scheduledAt) {
    parts.push(new Date(props.round.scheduledAt).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }))
  }
  const statusLabel = roundStatusOptions.find(o => o.value === props.round.status)?.label
  if (statusLabel) parts.push(statusLabel)
  if (props.round.interviewer) parts.push(props.round.interviewer)
  return parts.join(' · ')
})

// n-date-picker datetime 值为 number(timestamp) 或 null；存储为 ISO 字符串或 null
const scheduledAtTs = computed(() => {
  return props.round.scheduledAt ? new Date(props.round.scheduledAt).getTime() : null
})

function onFieldUpdate<K extends keyof InterviewRound>(key: K, value: InterviewRound[K]) {
  emit('update:round', { ...props.round, [key]: value })
}

function onScheduledAtUpdate(ts: number | null) {
  const iso = ts !== null ? new Date(ts).toISOString() : null
  onFieldUpdate('scheduledAt', iso)
}
</script>

<style lang="scss" scoped>
.round-editor {
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  padding: $spacing-md;
  background: $bg-glass;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    color: $text-secondary;
    font-weight: 600;
    font-size: $font-size-sm;
    cursor: pointer;
    user-select: none;

    &:hover {
      color: $text-primary;
    }
  }

  &__chevron {
    color: $text-light;
    transition: transform $transition-base;

    &--collapsed {
      transform: rotate(-90deg);
    }
  }

  &__title {
    flex-shrink: 0;
  }

  &__summary {
    flex: 1;
    margin-right: $spacing-sm;
    font-weight: 400;
    font-size: $font-size-xs;
    color: $text-light;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__remove {
    color: $text-light;

    &:hover {
      color: $error-color;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-sm;

    @include tablet {
      grid-template-columns: 1fr;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &--full {
      grid-column: 1 / -1;
    }

    label {
      font-size: $font-size-xs;
      color: $text-light;
    }
  }
}
</style>
