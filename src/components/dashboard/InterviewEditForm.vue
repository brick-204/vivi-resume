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
          <label>工作地点</label>
          <n-input
            :value="form.location"
            placeholder="如：上海"
            @update:value="onFieldUpdate('location', $event)"
          />
        </div>

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
          <label>面试地点</label>
          <n-input
            :value="form.interviewLocation"
            placeholder="如：XX 大厦 12 楼"
            @update:value="onFieldUpdate('interviewLocation', $event)"
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
import { NInput, NSelect, NButton } from 'naive-ui'
import draggable from 'vuedraggable'
import type { SelectOption } from 'naive-ui'
import type { Interview, InterviewStatus } from '@/types/interview'
import { createEmptyRound } from '@/types/interview'
import { generateId } from '@/types/resume'
import { useInterviewStore } from '@/stores/interviewStore'
import { useResumeStore } from '@/stores/resumeStore'
import { message as naiveMessage, dialog } from '@/plugins/naive-ui'
import InterviewRoundEditor from './InterviewRoundEditor.vue'

const props = defineProps<{ interview: Interview }>()

const emit = defineEmits<{
  saved: []
}>()

const interviewStore = useInterviewStore()
const resumeStore = useResumeStore()

// ponytail: 本地可变副本，避免每次输入触发 store 防抖；保存时一次性写回
const form = ref<Interview>(JSON.parse(JSON.stringify(props.interview)) as Interview)

// 公司信息折叠态（默认展开）；折叠时标题栏显示一行摘要
const companyCollapsed = ref(false)
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
  form.value = { ...form.value, [key]: value }
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

defineExpose({ save })
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
