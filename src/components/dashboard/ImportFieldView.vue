<template>
  <div class="import-field-view">
    <!-- 按模块遍历 -->
    <div v-for="sectionId in visibleSections" :key="sectionId" class="field-section">
      <!-- 模块标题栏 -->
      <div class="field-section__header" @click="toggleSection(sectionId)">
        <Icon :icon="isSectionCollapsed(sectionId) ? 'mdi:chevron-right' : 'mdi:chevron-down'" :width="16" />
        <Icon :icon="getSectionIcon(sectionId)" :width="16" />
        <span class="field-section__title">{{ getSectionLabel(sectionId) }}</span>
        <span v-if="sectionErrors(sectionId).length" class="field-section__error-badge">
          <Icon icon="mdi:alert-circle-outline" :width="14" />
          {{ sectionErrors(sectionId).length }}
        </span>
        <span class="field-section__summary">{{ getSectionSummary(sectionId) }}</span>
      </div>

      <!-- 模块内容（可折叠） -->
      <div v-show="!isSectionCollapsed(sectionId)" class="field-section__body">

        <!-- 基本信息 -->
        <template v-if="sectionId === 'basic'">
          <div v-if="resume.basicInfo.photo" class="field-row field-row--photo">
            <label>头像</label>
            <img :src="resume.basicInfo.photo" alt="头像" class="field-photo" />
          </div>
          <div class="field-grid">
            <div v-for="field in basicInfoFields" :key="field.key" class="field-row">
              <label>{{ field.label }}</label>
              <NInput
                :value="getBasicInfoValue(field.key)"
                :placeholder="field.emptyLabel"
                size="small"
                @update:value="val => onBasicInfoChange(field.key, val)"
              />
              <Icon
                v-if="fieldHasError('basic', field.key)"
                icon="mdi:alert-circle-outline"
                :width="14"
                class="field-error-icon"
              />
            </div>
          </div>
          <!-- 自定义字段 -->
          <div v-for="(cf, idx) in resume.basicInfo.customFields" :key="cf.id" class="field-row">
            <label>{{ cf.label || '自定义' }}</label>
            <NInput
              :value="cf.value"
              placeholder="(未识别)"
              size="small"
              @update:value="val => onCustomFieldChange(idx, val)"
            />
          </div>
        </template>

        <!-- 个人简介 -->
        <template v-else-if="sectionId === 'summary'">
          <NInput
            :value="htmlToPlainText(resume.basicInfo.summary)"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 6 }"
            placeholder="(未识别)"
            @update:value="val => onFieldChange(['basicInfo', 'summary'], val)"
          />
        </template>

        <!-- 工作经历 -->
        <template v-else-if="sectionId === 'work'">
          <div v-if="resume.workExperience.length === 0" class="field-empty">(未识别)</div>
          <div v-for="(item, idx) in resume.workExperience" :key="item.id" class="field-item-card">
            <div class="field-item-card__header" @click="toggleItem(`work-${idx}`)">
              <Icon :icon="isItemCollapsed(`work-${idx}`) ? 'mdi:chevron-right' : 'mdi:chevron-down'" :width="14" />
              <span class="field-item-card__label">{{ item.position || '未填写职位' }} @ {{ item.company || '未填写公司' }}</span>
              <span class="field-item-card__date">{{ item.startDate }}{{ item.startDate && item.endDate ? ' - ' : '' }}{{ item.endDate }}</span>
            </div>
            <div v-show="!isItemCollapsed(`work-${idx}`)" class="field-item-card__body">
              <div class="field-grid">
                <div class="field-row">
                  <label>公司</label>
                  <NInput :value="item.company" placeholder="公司名称" size="small" @update:value="val => onArrayItemChange('workExperience', idx, 'company', val)" />
                </div>
                <div class="field-row">
                  <label>职位</label>
                  <NInput :value="item.position" placeholder="职位" size="small" @update:value="val => onArrayItemChange('workExperience', idx, 'position', val)" />
                </div>
              </div>
              <div class="field-grid">
                <div class="field-row">
                  <label>开始日期</label>
                  <NInput :value="item.startDate" placeholder="YYYY-MM" size="small" @update:value="val => onArrayItemChange('workExperience', idx, 'startDate', val)" />
                </div>
                <div class="field-row">
                  <label>结束日期</label>
                  <NInput :value="item.endDate" placeholder="YYYY-MM" size="small" @update:value="val => onArrayItemChange('workExperience', idx, 'endDate', val)" />
                </div>
              </div>
              <div class="field-row">
                <label>工作描述</label>
                <NInput
                  :value="htmlToPlainText(item.description)"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 6 }"
                  placeholder="描述工作内容..."
                  @update:value="val => onArrayItemChange('workExperience', idx, 'description', val)"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 教育经历 -->
        <template v-else-if="sectionId === 'education'">
          <div v-if="resume.education.length === 0" class="field-empty">(未识别)</div>
          <div v-for="(item, idx) in resume.education" :key="item.id" class="field-item-card">
            <div class="field-item-card__header" @click="toggleItem(`education-${idx}`)">
              <Icon :icon="isItemCollapsed(`education-${idx}`) ? 'mdi:chevron-right' : 'mdi:chevron-down'" :width="14" />
              <span class="field-item-card__label">{{ item.school || '未填写学校' }}</span>
              <span v-if="item.degree || item.major" class="field-item-card__date">{{ item.degree }}{{ item.degree && item.major ? ' · ' : '' }}{{ item.major }}</span>
            </div>
            <div v-show="!isItemCollapsed(`education-${idx}`)" class="field-item-card__body">
              <div class="field-row">
                <label>学校</label>
                <NInput :value="item.school" placeholder="学校名称" size="small" @update:value="val => onArrayItemChange('education', idx, 'school', val)" />
              </div>
              <div class="field-grid">
                <div class="field-row">
                  <label>学历</label>
                  <NInput :value="item.degree" placeholder="如：本科" size="small" @update:value="val => onArrayItemChange('education', idx, 'degree', val)" />
                </div>
                <div class="field-row">
                  <label>专业</label>
                  <NInput :value="item.major" placeholder="专业" size="small" @update:value="val => onArrayItemChange('education', idx, 'major', val)" />
                </div>
              </div>
              <div class="field-grid">
                <div class="field-row">
                  <label>开始日期</label>
                  <NInput :value="item.startDate" placeholder="YYYY-MM" size="small" @update:value="val => onArrayItemChange('education', idx, 'startDate', val)" />
                </div>
                <div class="field-row">
                  <label>结束日期</label>
                  <NInput :value="item.endDate" placeholder="YYYY-MM" size="small" @update:value="val => onArrayItemChange('education', idx, 'endDate', val)" />
                </div>
              </div>
              <div class="field-row">
                <label>补充说明</label>
                <NInput
                  :value="htmlToPlainText(item.description)"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  placeholder="如：GPA、获奖情况..."
                  @update:value="val => onArrayItemChange('education', idx, 'description', val)"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 项目经验 -->
        <template v-else-if="sectionId === 'projects'">
          <div v-if="resume.projects.length === 0" class="field-empty">(未识别)</div>
          <div v-for="(item, idx) in resume.projects" :key="item.id" class="field-item-card">
            <div class="field-item-card__header" @click="toggleItem(`projects-${idx}`)">
              <Icon :icon="isItemCollapsed(`projects-${idx}`) ? 'mdi:chevron-right' : 'mdi:chevron-down'" :width="14" />
              <span class="field-item-card__label">{{ item.name || '未填写项目' }}</span>
              <span v-if="item.role" class="field-item-card__date">{{ item.role }}</span>
            </div>
            <div v-show="!isItemCollapsed(`projects-${idx}`)" class="field-item-card__body">
              <div class="field-grid">
                <div class="field-row">
                  <label>项目名称</label>
                  <NInput :value="item.name" placeholder="项目名称" size="small" @update:value="val => onArrayItemChange('projects', idx, 'name', val)" />
                </div>
                <div class="field-row">
                  <label>角色</label>
                  <NInput :value="item.role" placeholder="如：前端负责人" size="small" @update:value="val => onArrayItemChange('projects', idx, 'role', val)" />
                </div>
              </div>
              <div class="field-grid">
                <div class="field-row">
                  <label>开始日期</label>
                  <NInput :value="item.startDate" placeholder="YYYY-MM" size="small" @update:value="val => onArrayItemChange('projects', idx, 'startDate', val)" />
                </div>
                <div class="field-row">
                  <label>结束日期</label>
                  <NInput :value="item.endDate" placeholder="YYYY-MM" size="small" @update:value="val => onArrayItemChange('projects', idx, 'endDate', val)" />
                </div>
              </div>
              <div class="field-row">
                <label>项目描述</label>
                <NInput
                  :value="htmlToPlainText(item.description)"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 6 }"
                  placeholder="描述项目内容..."
                  @update:value="val => onArrayItemChange('projects', idx, 'description', val)"
                />
              </div>
              <div class="field-row">
                <label>技术栈</label>
                <NInput
                  :value="(item.technologies || []).join(', ')"
                  placeholder="用逗号分隔，如：Vue, TypeScript"
                  size="small"
                  @update:value="val => onArrayItemChange('projects', idx, 'technologies', val.split(',').map((s: string) => s.trim()).filter(Boolean))"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 技能 -->
        <template v-else-if="sectionId === 'skills'">
          <div v-if="resume.skills.length === 0" class="field-empty">(未识别)</div>
          <NInput
            v-for="(item, idx) in resume.skills"
            :key="item.id"
            :value="htmlToPlainText(item.content)"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 6 }"
            placeholder="技能内容"
            @update:value="val => onFieldChange(['skills', idx, 'content'], val)"
          />
        </template>

        <!-- 自我评价 -->
        <template v-else-if="sectionId === 'evaluation'">
          <NInput
            :value="htmlToPlainText(resume.selfEvaluation)"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 8 }"
            placeholder="(未识别)"
            @update:value="val => onFieldChange(['selfEvaluation'], val)"
          />
        </template>

        <!-- 自定义文本 -->
        <template v-else-if="sectionId.startsWith('customText_')">
          <NInput
            :value="htmlToPlainText(getCustomTextContent(sectionId))"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 6 }"
            placeholder="(未识别)"
            @update:value="val => onCustomTextChange(sectionId, val)"
          />
        </template>

        <!-- 自定义列表 -->
        <template v-else-if="sectionId.startsWith('customCard_')">
          <div v-for="(item, idx) in getCustomCardItems(sectionId)" :key="item.id" class="field-item-card">
            <div class="field-item-card__header" @click="toggleItem(`${sectionId}-${idx}`)">
              <Icon :icon="isItemCollapsed(`${sectionId}-${idx}`) ? 'mdi:chevron-right' : 'mdi:chevron-down'" :width="14" />
              <span class="field-item-card__label">{{ item.name || '未填写' }}</span>
            </div>
            <div v-show="!isItemCollapsed(`${sectionId}-${idx}`)" class="field-item-card__body">
              <div class="field-grid">
                <div class="field-row">
                  <label>名称</label>
                  <NInput :value="item.name" placeholder="名称" size="small" @update:value="val => onCustomCardItemChange(sectionId, idx, 'name', val)" />
                </div>
                <div class="field-row">
                  <label>角色</label>
                  <NInput :value="item.role" placeholder="角色" size="small" @update:value="val => onCustomCardItemChange(sectionId, idx, 'role', val)" />
                </div>
              </div>
              <div class="field-grid">
                <div class="field-row">
                  <label>开始日期</label>
                  <NInput :value="item.startDate" placeholder="YYYY-MM" size="small" @update:value="val => onCustomCardItemChange(sectionId, idx, 'startDate', val)" />
                </div>
                <div class="field-row">
                  <label>结束日期</label>
                  <NInput :value="item.endDate" placeholder="YYYY-MM" size="small" @update:value="val => onCustomCardItemChange(sectionId, idx, 'endDate', val)" />
                </div>
              </div>
              <div class="field-row">
                <label>描述</label>
                <NInput
                  :value="htmlToPlainText(item.description)"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  placeholder="描述内容..."
                  @update:value="val => onCustomCardItemChange(sectionId, idx, 'description', val)"
                />
              </div>
              <div class="field-row">
                <label>关键词</label>
                <NInput
                  :value="(item.keywords || []).join(', ')"
                  placeholder="用逗号分隔"
                  size="small"
                  @update:value="val => onCustomCardItemChange(sectionId, idx, 'keywords', val.split(',').map((s: string) => s.trim()).filter(Boolean))"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { NInput } from 'naive-ui'
import type { Resume, CustomCardItem } from '@/types/resume'
import { SECTION_CONFIG, DEFAULT_SECTION_TITLES, getCustomSectionType, getCustomSectionIndex } from '@/types/resume'
import type { ValidationError } from '@/schemas/resumeSchema'
import { FIELD_LABELS } from '@/constants/fieldLabels'
import { htmlToPlainText } from '@/services/aiService'

const props = defineProps<{
  resume: Resume
  errors: ValidationError[]
}>()

const emit = defineEmits<{
  'field-change': [path: (string | number)[], value: unknown]
}>()

// ========== 折叠状态 ==========
const collapsedSections = ref<Set<string>>(new Set())
const collapsedItems = ref<Set<string>>(new Set())

function toggleSection(sectionId: string) {
  const next = new Set(collapsedSections.value)
  if (next.has(sectionId)) next.delete(sectionId)
  else next.add(sectionId)
  collapsedSections.value = next
}

function isSectionCollapsed(sectionId: string): boolean {
  return collapsedSections.value.has(sectionId)
}

function toggleItem(key: string) {
  const next = new Set(collapsedItems.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedItems.value = next
}

function isItemCollapsed(key: string): boolean {
  return collapsedItems.value.has(key)
}

// ========== 可见模块 ==========
const visibleSections = computed(() => {
  const order = props.resume.sectionOrder
  // 始终包含 basic，即使不在 sectionOrder 中
  const sections = order.includes('basic') ? order : ['basic', ...order]
  return sections
})

// ========== 模块元信息 ==========
function getSectionIcon(sectionId: string): string {
  const type = getCustomSectionType(sectionId)
  const key = type || sectionId
  const config = SECTION_CONFIG[key]
  return config ? `mdi:${config.icon}` : 'mdi:text-box-outline'
}

function getSectionLabel(sectionId: string): string {
  const type = getCustomSectionType(sectionId)
  const key = type || sectionId
  return props.resume.sectionTitles?.[sectionId]
    || DEFAULT_SECTION_TITLES[key]
    || SECTION_CONFIG[key]?.label
    || sectionId
}

// ========== 模块摘要（折叠时显示） ==========
function getSectionSummary(sectionId: string): string {
  const r = props.resume
  switch (sectionId) {
    case 'basic': {
      const parts: string[] = []
      if (r.basicInfo.name) parts.push(r.basicInfo.name)
      if (r.basicInfo.title) parts.push(r.basicInfo.title)
      return parts.length ? parts.join(' · ') : '(未识别)'
    }
    case 'summary': {
      const text = htmlToPlainText(r.basicInfo.summary)
      return text ? truncate(text, 50) : '(未识别)'
    }
    case 'work': {
      if (r.workExperience.length === 0) return '(未识别)'
      const items = r.workExperience.map(w =>
        [w.company, w.position].filter(Boolean).join(' ')
      )
      return `${r.workExperience.length} 条 · ${truncate(items.join(', '), 60)}`
    }
    case 'education': {
      if (r.education.length === 0) return '(未识别)'
      const items = r.education.map(e => e.school).filter(Boolean)
      return `${r.education.length} 条 · ${truncate(items.join(', '), 60)}`
    }
    case 'projects': {
      if (r.projects.length === 0) return '(未识别)'
      const items = r.projects.map(p => p.name).filter(Boolean)
      return `${r.projects.length} 条 · ${truncate(items.join(', '), 60)}`
    }
    case 'skills': {
      if (r.skills.length === 0) return '(未识别)'
      const text = htmlToPlainText(r.skills.map(s => s.content).join(' / '))
      return text ? truncate(text, 60) : '(未识别)'
    }
    case 'evaluation': {
      const text = htmlToPlainText(r.selfEvaluation)
      return text ? truncate(text, 50) : '(未识别)'
    }
    default: {
      if (sectionId.startsWith('customText_')) {
        const content = htmlToPlainText(getCustomTextContent(sectionId))
        return content ? truncate(content, 50) : '(未识别)'
      }
      if (sectionId.startsWith('customCard_')) {
        const items = getCustomCardItems(sectionId)
        return items.length ? `${items.length} 条` : '(未识别)'
      }
      return ''
    }
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

// ========== 错误分组 ==========
function sectionErrors(sectionId: string): ValidationError[] {
  const sectionLabel = getSectionLabel(sectionId)
  return props.errors.filter(err => {
    // 错误 path 格式："基本信息 - 姓名" 或 "工作经历 - [0] - 公司"
    // 匹配模块标签前缀
    if (err.path.startsWith(sectionLabel)) return true
    // 也匹配 sectionId 对应的 FIELD_LABELS
    const fieldLabel = FIELD_LABELS[sectionId]
    if (fieldLabel && err.path.startsWith(fieldLabel)) return true
    return false
  })
}

function fieldHasError(sectionId: string, fieldKey: string): boolean {
  const sectionLabel = getSectionLabel(sectionId)
  const fieldLabel = FIELD_LABELS[fieldKey] || fieldKey
  return props.errors.some(err =>
    err.path === `${sectionLabel} - ${fieldLabel}`
  )
}

// ========== 基本信息 ==========
const basicInfoFields = [
  { key: 'name', label: '姓名', emptyLabel: '(未识别)' },
  { key: 'title', label: '职位', emptyLabel: '(未识别)' },
  { key: 'email', label: '邮箱', emptyLabel: '(未识别)' },
  { key: 'phone', label: '电话', emptyLabel: '(未识别)' },
  { key: 'location', label: '所在地', emptyLabel: '(未识别)' },
  { key: 'website', label: '个人网站', emptyLabel: '(未识别)' },
  { key: 'gender', label: '性别', emptyLabel: '(未识别)' },
  { key: 'birthday', label: '出生日期', emptyLabel: '(未识别)' },
  { key: 'age', label: '年龄', emptyLabel: '(未识别)' },
  { key: 'expectedCity', label: '期望城市', emptyLabel: '(未识别)' },
  { key: 'workExperience', label: '工作经验', emptyLabel: '(未识别)' },
  { key: 'wechat', label: '微信号', emptyLabel: '(未识别)' },
  { key: 'qq', label: 'QQ', emptyLabel: '(未识别)' },
  { key: 'salaryRange', label: '薪资要求', emptyLabel: '(未识别)' },
]

function getBasicInfoValue(key: string): string {
  return (props.resume.basicInfo as any)[key] ?? ''
}

function onBasicInfoChange(key: string, value: string) {
  onFieldChange(['basicInfo', key], value)
}

function onCustomFieldChange(idx: number, value: string) {
  onFieldChange(['basicInfo', 'customFields', idx, 'value'], value)
}

// ========== 数组项编辑 ==========
function onArrayItemChange(arrayKey: string, idx: number, field: string, value: unknown) {
  onFieldChange([arrayKey, idx, field], value)
}

// ========== 自定义模块 ==========
function getCustomTextContent(sectionId: string): string {
  const idx = getCustomSectionIndex(sectionId)
  if (idx === null) return ''
  return props.resume.customTexts[idx]?.content ?? ''
}

function onCustomTextChange(sectionId: string, value: string) {
  const idx = getCustomSectionIndex(sectionId)
  if (idx === null) return
  onFieldChange(['customTexts', idx, 'content'], value)
}

function getCustomCardItems(sectionId: string): CustomCardItem[] {
  const idx = getCustomSectionIndex(sectionId)
  if (idx === null) return []
  return props.resume.customCards[idx]?.items ?? []
}

function onCustomCardItemChange(sectionId: string, itemIdx: number, field: string, value: unknown) {
  const sectionIdx = getCustomSectionIndex(sectionId)
  if (sectionIdx === null) return
  onFieldChange(['customCards', sectionIdx, 'items', itemIdx, field], value)
}

// ========== 通用字段变更 ==========
function onFieldChange(path: (string | number)[], value: unknown) {
  emit('field-change', path, value)
}
</script>

<style lang="scss" scoped>
.import-field-view {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.field-section {
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;
    font-size: $font-size-sm;
    font-weight: 500;
    color: $text-secondary;
    transition: background $transition-base;

    &:hover {
      background: rgba($primary-color, 0.05);
    }
  }

  &__title {
    color: $text-primary;
    font-weight: 600;
  }

  &__error-badge {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: $spacing-xs;
    padding: 1px 6px;
    font-size: 11px;
    font-weight: 600;
    color: $error-color;
    background: rgba($error-color, 0.1);
    border-radius: 10px;
  }

  &__summary {
    margin-left: auto;
    font-size: $font-size-xs;
    color: $text-light;
    max-width: 50%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__body {
    border-top: 1px solid $border-glass;
    padding: $spacing-md;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-sm;
}

.field-row {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;

  &--photo {
    align-items: center;
    margin-bottom: $spacing-sm;
  }

  label {
    font-size: $font-size-xs;
    color: $text-light;
    white-space: nowrap;
    min-width: 60px;
    padding-top: 5px;
    flex-shrink: 0;
  }

  // NInput 占满剩余空间
  :deep(.n-input) {
    flex: 1;
  }
}

.field-photo {
  width: 48px;
  height: 48px;
  border-radius: $radius-full;
  object-fit: cover;
  border: 2px solid $border-glass;
}

.field-error-icon {
  color: $error-color;
  flex-shrink: 0;
  margin-top: 5px;
}

.field-empty {
  font-size: $font-size-sm;
  color: $text-light;
  font-style: italic;
}

.field-item-card {
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-md;
    cursor: pointer;
    font-size: $font-size-sm;
    color: $text-primary;
    background: $bg-glass;
    transition: background $transition-base;

    &:hover {
      background: rgba($primary-color, 0.05);
    }
  }

  &__label {
    font-weight: 500;
  }

  &__date {
    font-size: $font-size-xs;
    color: $text-light;
    margin-left: auto;
  }

  &__body {
    padding: $spacing-sm $spacing-md;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    border-top: 1px solid $border-glass;
  }
}

@include mobile {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .field-section__summary {
    display: none;
  }
}
</style>
