<template>
  <div class="interview-edit-form">
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
      <div class="form-section__title">
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

      <div class="form-rounds">
        <InterviewRoundEditor
          v-for="(r, i) in form.rounds"
          :key="r.id"
          :round="r"
          :index="i"
          @update:round="onRoundUpdate(i, $event)"
          @remove="onRoundRemove(i)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { NInput, NSelect, NButton } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import type { Interview, InterviewStatus } from '@/types/interview'
import { createEmptyRound } from '@/types/interview'
import { useInterviewStore } from '@/stores/interviewStore'
import { useResumeStore } from '@/stores/resumeStore'
import { message as naiveMessage } from '@/plugins/naive-ui'
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
  const rounds = form.value.rounds.filter((_, i) => i !== index)
  form.value = { ...form.value, rounds }
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
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
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
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-sm;

  @include tablet {
    grid-template-columns: 1fr;
  }
}

.form-field {
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

  &__required {
    color: $error-color;
  }
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
  gap: $spacing-sm;
}
</style>
