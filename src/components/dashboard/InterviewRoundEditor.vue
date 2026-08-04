<template>
  <div class="round-editor">
    <div class="round-editor__header" @click="collapsed = !collapsed">
      <Icon
        class="round-editor__drag"
        icon="mdi:drag"
        :width="18"
        title="拖拽排序"
        @click.stop
      />
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
        class="round-editor__copy"
        title="复制此轮"
        @click.stop="emit('duplicate')"
      >
        <template #icon>
          <Icon icon="mdi:content-copy" :width="16" />
        </template>
      </n-button>
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
          filterable
          tag
          size="small"
          placeholder="选择或输入"
          @update:value="(v: string | null) => onFieldUpdate('roundType', v ?? '')"
        />
      </div>

      <div class="round-editor__field">
        <label>面试时间</label>
        <div class="round-editor__time-row">
          <n-date-picker
            :value="scheduledAtTs"
            type="datetime"
            size="small"
            clearable
            format="yyyy-MM-dd HH:mm"
            :default-time="'00:00:00'"
            :time-picker-props="{ format: 'HH:mm' }"
            @update:value="onScheduledAtUpdate"
          />
          <n-button
            quaternary
            size="small"
            class="round-editor__sharp"
            :disabled="!scheduledAtTs"
            title="整点：分秒置 00"
            @click="onSharpClick"
          >
            整点
          </n-button>
        </div>
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
        <label>面试链接</label>
        <n-input
          :value="round.meetingLink"
          size="small"
          placeholder="粘贴完整会议链接，如 https://meeting.tencent.com/..."
          @update:value="onFieldUpdate('meetingLink', $event)"
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
import type { InterviewRound, RoundStatus, InterviewFormat } from '@/types/interview'

const props = defineProps<{
  round: InterviewRound
  index: number
}>()

const emit = defineEmits<{
  'update:round': [round: InterviewRound]
  remove: []
  duplicate: []
}>()

const roundTypeOptions = [
  { label: '一面', value: '一面' },
  { label: '二面', value: '二面' },
  { label: 'HR面', value: 'HR面' },
  { label: '终面', value: '终面' },
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

const roundTypeLabel = computed(() => props.round.roundType || '未命名轮次')

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

// ponytail: 时间统一不存秒——picker 关了秒选择（format HH:mm），存值也清秒，避免显示层带 :00 末尾
function onScheduledAtUpdate(ts: number | null) {
  if (ts === null) {
    onFieldUpdate('scheduledAt', null)
    return
  }
  const d = new Date(ts)
  d.setSeconds(0, 0)
  onFieldUpdate('scheduledAt', d.toISOString())
}

/** 整点按钮：保留年月日时，分秒置 0（如 14:23:45 → 14:00:00） */
function onSharpClick() {
  const ts = scheduledAtTs.value
  if (ts === null) return
  const d = new Date(ts)
  d.setMinutes(0, 0, 0)
  onFieldUpdate('scheduledAt', d.toISOString())
}
</script>

<style lang="scss" scoped>
.round-editor {
  // ponytail: 外层 .form-section 已是实色卡片，轮次卡用次级背景内嵌，避免卡片套卡片同色
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  padding: $spacing-lg;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  // ponytail: vuedraggable 拖拽占位——半透明 + 虚线边框
  &--ghost {
    opacity: 0.5;
    border: 1px dashed $primary-color;
    background: var(--bg-primary);
  }

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

  &__drag {
    color: $text-light;
    cursor: grab;
    flex-shrink: 0;

    &:active {
      cursor: grabbing;
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

  &__copy {
    color: $text-light;

    &:hover {
      color: $primary-color;
    }
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
    gap: $spacing-md;

    @include tablet {
      grid-template-columns: 1fr;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &--full {
      grid-column: 1 / -1;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: $text-secondary;
    }
  }

  // 时间选择 + 整点按钮同行
  &__time-row {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }

  &__sharp {
    flex-shrink: 0;
    color: $text-light;
    font-size: $font-size-xs;

    &:not(:disabled):hover {
      color: $primary-color;
    }
  }

  // ponytail: __body 包着 __grid + 3 个 full 字段，需自带 gap 否则 full 字段紧贴 grid
  &__body {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }
}

// ponytail: 同 InterviewEditForm——Outfit weight 400 发虚，输入框正文提到 600（方案 C：更实）
:deep(.n-input .n-input__input-el),
:deep(.n-input .n-input__textarea-el) {
  font-weight: 600;
}
</style>
