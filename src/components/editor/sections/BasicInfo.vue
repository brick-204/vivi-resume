<template>
  <div class="section">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <Icon :icon="USER_ICON" :width="18" :height="18" />
        </span>
        基本信息
      </h3>
    </div>

    <div class="section__form">
      <!-- 显示控制 -->
      <div class="display-controls">
        <BaseCheckbox v-model="whiteHeaderText">白色文字</BaseCheckbox>
        <BaseSwitch v-model="iconFollowAccent">图标跟随主题色</BaseSwitch>
      </div>

      <!-- 头部布局选择 -->
      <div class="layout-selector">
        <span class="layout-selector__label">头部布局</span>
        <div class="layout-selector__options">
          <button
            v-for="opt in layoutOptions"
            :key="opt.value"
            class="layout-btn"
            :class="{ 'layout-btn--active': headerLayout === opt.value }"
            :title="opt.label"
            @click="headerLayout = opt.value"
          >
            <svg viewBox="0 0 36 28" width="36" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <component :is="opt.icon" />
            </svg>
            <span class="layout-btn__text">{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- 头像（始终在顶部，不参与拖拽） -->
      <div class="field-row" v-if="isFieldInOrder('photo')">
        <div class="field-row__label">
          <span>头像</span>
          <div class="field-row__actions">
            <button class="field-toggle" :aria-label="basicInfo.hiddenFields?.photo ? '显示' : '隐藏'" @click="toggleFieldVisibility('photo')">
              <Icon :icon="basicInfo.hiddenFields?.photo ? EYE_OFF_ICON : EYE_ICON" :width="16" :height="16" />
            </button>
          </div>
        </div>
        <div class="photo-upload">
          <div v-if="basicInfo.photo" class="photo-row">
            <div class="photo-preview" :class="basicInfo.photoShape === 'rectangle' ? 'photo-preview--rectangle' : 'photo-preview--circle'">
              <img :src="basicInfo.photo" alt="头像预览" />
            </div>
            <div class="photo-actions">
              <label class="photo-action" title="重新上传">
                <input type="file" accept="image/*" class="photo-input" @change="handlePhotoUpload" />
                <Icon icon="mdi:upload-outline" :width="16" :height="16" />
              </label>
              <button class="photo-action" title="编辑" @click="openPhotoEditor">
                <Icon icon="mdi:pencil-outline" :width="16" :height="16" />
              </button>
              <button class="photo-action photo-action--danger" title="删除" @click="deletePhoto">
                <Icon :icon="TRASH_ICON" :width="16" :height="16" />
              </button>
            </div>
          </div>
          <label v-else class="photo-placeholder">
            <input type="file" accept="image/*" class="photo-input" @change="handlePhotoUpload" />
            <Icon icon="mdi:camera-plus-outline" :width="32" :height="32" />
            <span>点击上传头像</span>
          </label>
        </div>
      </div>

      <!-- 固定字段：姓名、职位（不可拖拽） -->
      <div class="fields-grid fields-grid--fixed">
        <div v-for="fieldKey in fixedFields" :key="fieldKey" class="field-item field-item--fixed">
          <div class="field-item__content">
            <div class="field-row__label">
              <span>{{ getFieldLabel(fieldKey) }}</span>
              <div class="field-row__actions">
                <button class="field-toggle" :aria-label="isFieldHidden(fieldKey) ? '显示' : '隐藏'" @click="toggleFieldVisibility(fieldKey)">
                  <Icon :icon="isFieldHidden(fieldKey) ? EYE_OFF_ICON : EYE_ICON" :width="16" :height="16" />
                </button>
              </div>
            </div>
            <BaseInput
              :model-value="basicInfo[fieldKey as keyof BasicInfo] as string"
              @update:model-value="updateFieldValue(fieldKey, $event)"
              :type="getFieldType(fieldKey)"
              :placeholder="getFieldPlaceholder(fieldKey)"
            />
          </div>
        </div>
      </div>

      <!-- 可拖拽字段区域 -->
      <draggable
        v-model="draggableFieldOrder"
        item-key="key"
        handle=".field-item__drag-handle"
        :animation="200"
        ghost-class="field-item--ghost"
        chosen-class="field-item--chosen"
        drag-class="field-item--drag"
        class="fields-grid"
        :scroll="scrollContainer"
        :scroll-sensitivity="80"
        :scroll-speed="10"
        @start="flipFields.recordPositions"
        @end="flipFields.animateFlip"
      >
        <template #item="{ element }">
          <div class="field-item" :data-flip-id="element.key">
            <span class="field-item__drag-handle">
              <Icon :icon="DRAG_HANDLE_ICON" :width="16" :height="16" />
            </span>
            <div class="field-item__content">
              <div class="field-row__label">
                <span v-if="isCustomField(element.key)" class="custom-field__label-text" contenteditable @keydown.enter.prevent @blur="onCustomLabelBlur(element.key, $event)">{{ getFieldLabel(element.key) }}</span>
                <span v-else>{{ getFieldLabel(element.key) }}</span>
                <div class="field-row__actions">
                  <button class="field-display-mode" :title="getDisplayModeTitle(element.key)" @click="cycleDisplayMode(element.key)">
                    <Icon :icon="getDisplayModeIcon(element.key)" :width="16" :height="16" />
                  </button>
                  <button class="field-toggle" :aria-label="isFieldHidden(element.key) ? '显示' : '隐藏'" @click="toggleFieldVisibility(element.key)">
                    <Icon :icon="isFieldHidden(element.key) ? EYE_OFF_ICON : EYE_ICON" :width="16" :height="16" />
                  </button>
                  <button v-if="isCustomField(element.key)" class="field-delete" @click="removeCustomField(getCustomId(element.key))">
                    <Icon :icon="TRASH_ICON" :width="16" :height="16" />
                  </button>
                </div>
              </div>
              <!-- 自定义字段 -->
              <template v-if="isCustomField(element.key)">
                <BaseInput
                  :model-value="getCustomField(element.key)?.value ?? ''"
                  @update:model-value="updateCustomFieldValue(element.key, $event)"
                  :placeholder="'请输入内容'"
                />
              </template>
              <!-- 固定字段 -->
              <template v-else>
                <BaseInput
                  :model-value="basicInfo[element.key as keyof BasicInfo] as string"
                  @update:model-value="updateFieldValue(element.key, $event)"
                  :type="getFieldType(element.key)"
                  :placeholder="getFieldPlaceholder(element.key)"
                />
              </template>
            </div>
          </div>
        </template>
      </draggable>

      <button class="add-custom-field" @click="addCustomField">
        <Icon icon="mdi:plus" :width="18" :height="18" />
        <span>添加自定义字段</span>
      </button>
    </div>

    <PhotoEditor
      v-if="editingPhotoSrc"
      :visible="showPhotoEditor"
      :image-src="editingPhotoSrc"
      :current-shape="basicInfo.photoShape"
      @close="showPhotoEditor = false; editingPhotoSrc = ''"
      @confirm="handlePhotoEditorConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, h } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { USER_ICON, EYE_ICON, EYE_OFF_ICON, TRASH_ICON, DRAG_HANDLE_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import PhotoEditor from './PhotoEditor.vue'
import draggable from 'vuedraggable'
import { generateId, DEFAULT_FIELD_ORDER, createEmptyResume } from '@/types/resume'
import type { BasicInfo, CustomField, FieldDisplayMode, HeaderLayout } from '@/types/resume'
import { ScrollContainerKey } from '../scrollContainerKey'
import { useFlipAnimation } from '@/composables/useFlipAnimation'

const store = useResumeStore()
const scrollContainer = inject(ScrollContainerKey)
const flipFields = useFlipAnimation(() => scrollContainer?.value, '.field-item')

const showPhotoEditor = ref(false)
const editingPhotoSrc = ref('')

// ---- 基本信息显示控制 ----
const whiteHeaderText = computed({
  get: () => store.currentResume?.whiteHeaderText ?? false,
  set: (val) => store.updateCurrentResume({ whiteHeaderText: val }),
})

const iconFollowAccent = computed({
  get: () => store.currentResume?.iconFollowAccent ?? false,
  set: (val) => store.updateCurrentResume({ iconFollowAccent: val }),
})

const headerLayout = computed({
  get: () => store.currentResume?.basicInfo?.headerLayout ?? 'centered',
  set: (val: HeaderLayout) => {
    if (!basicInfo.value) return
    basicInfo.value = { ...basicInfo.value, headerLayout: val }
  },
})

// 布局预览图标组件
const LayoutIconLeft = {
  render() {
    return h('g', [
      h('circle', { cx: '8', cy: '10', r: '5', fill: 'currentColor', opacity: '0.4' }),
      h('rect', { x: '16', y: '6', width: '16', height: '3', rx: '1.5', fill: 'currentColor' }),
      h('rect', { x: '16', y: '12', width: '10', height: '2', rx: '1', fill: 'currentColor', opacity: '0.4' }),
      h('rect', { x: '4', y: '19', width: '28', height: '2', rx: '1', fill: 'currentColor', opacity: '0.2' }),
      h('rect', { x: '4', y: '23', width: '22', height: '2', rx: '1', fill: 'currentColor', opacity: '0.2' }),
    ])
  }
}

const LayoutIconCenter = {
  render() {
    return h('g', [
      h('circle', { cx: '18', cy: '7', r: '4', fill: 'currentColor', opacity: '0.4' }),
      h('rect', { x: '10', y: '13', width: '16', height: '3', rx: '1.5', fill: 'currentColor' }),
      h('rect', { x: '13', y: '18', width: '10', height: '2', rx: '1', fill: 'currentColor', opacity: '0.4' }),
      h('rect', { x: '4', y: '23', width: '28', height: '2', rx: '1', fill: 'currentColor', opacity: '0.2' }),
    ])
  }
}

const LayoutIconRight = {
  render() {
    return h('g', [
      h('circle', { cx: '28', cy: '10', r: '5', fill: 'currentColor', opacity: '0.4' }),
      h('rect', { x: '4', y: '6', width: '16', height: '3', rx: '1.5', fill: 'currentColor' }),
      h('rect', { x: '10', y: '12', width: '10', height: '2', rx: '1', fill: 'currentColor', opacity: '0.4' }),
      h('rect', { x: '4', y: '19', width: '28', height: '2', rx: '1', fill: 'currentColor', opacity: '0.2' }),
      h('rect', { x: '4', y: '23', width: '22', height: '2', rx: '1', fill: 'currentColor', opacity: '0.2' }),
    ])
  }
}

const layoutOptions: { value: HeaderLayout; label: string; icon: typeof LayoutIconLeft }[] = [
  { value: 'photo-left', label: '左图', icon: LayoutIconLeft },
  { value: 'centered', label: '居中', icon: LayoutIconCenter },
  { value: 'photo-right', label: '右图', icon: LayoutIconRight },
]

const basicInfo = computed({
  get: () => store.currentResume?.basicInfo ?? createEmptyResume().basicInfo,
  set: (value) => store.updateCurrentResume({ basicInfo: value })
})

// 字段元信息
type InputType = 'text' | 'email' | 'tel' | 'url' | 'date' | 'month'

const FIELD_META: Record<string, { label: string; placeholder: string; type: InputType }> = {
  name: { label: '姓名', placeholder: '请输入姓名', type: 'text' },
  title: { label: '职位', placeholder: '如：前端工程师', type: 'text' },
  gender: { label: '性别', placeholder: '如：男', type: 'text' },
  birthday: { label: '生日', placeholder: '选择月份', type: 'month' },
  age: { label: '年龄', placeholder: '如：28', type: 'text' },
  maritalStatus: { label: '婚姻状态', placeholder: '如：未婚', type: 'text' },
  politicalStatus: { label: '政治面貌', placeholder: '如：中共党员', type: 'text' },
  hometown: { label: '籍贯', placeholder: '如：湖南长沙', type: 'text' },
  location: { label: '所在地', placeholder: '如：北京', type: 'text' },
  expectedCity: { label: '期望城市', placeholder: '如：上海', type: 'text' },
  workStartDate: { label: '参加工作时间', placeholder: '选择时间', type: 'month' },
  salaryRange: { label: '薪资要求', placeholder: '如：15k-25k', type: 'text' },
  email: { label: '邮箱', placeholder: '请输入邮箱', type: 'text' },
  phone: { label: '电话', placeholder: '请输入电话', type: 'text' },
  wechat: { label: '微信号', placeholder: '如：wxid_xxx', type: 'text' },
  qq: { label: 'QQ', placeholder: '如：123456789', type: 'text' },
  website: { label: '个人网站', placeholder: '如：github.com/xxx', type: 'text' },
}

const getFieldLabel = (key: string): string => {
  if (isCustomField(key)) {
    const field = getCustomField(key)
    return field?.label || '自定义字段'
  }
  return FIELD_META[key]?.label || key
}

const getFieldPlaceholder = (key: string): string => FIELD_META[key]?.placeholder || ''

const getFieldType = (key: string): InputType => FIELD_META[key]?.type || 'text'

// 可作为字符串值访问的 BasicInfo 字段 key
type StringFieldKey = 'name' | 'title' | 'gender' | 'birthday' | 'age' | 'maritalStatus' | 'politicalStatus' | 'hometown' | 'location' | 'expectedCity' | 'workStartDate' | 'salaryRange' | 'email' | 'phone' | 'wechat' | 'qq' | 'website' | 'photo' | 'summary'

const updateFieldValue = (key: string, value: string) => {
  if (!FIELD_META[key] || !basicInfo.value) return
  basicInfo.value = { ...basicInfo.value, [key as StringFieldKey]: value }
}

const updateCustomFieldValue = (fieldKey: string, value: string) => {
  if (!basicInfo.value) return
  const id = getCustomId(fieldKey)
  const customFields = [...(basicInfo.value.customFields || [])]
  const idx = customFields.findIndex(f => f.id === id)
  if (idx !== -1) {
    customFields[idx] = { ...customFields[idx], value }
    basicInfo.value = { ...basicInfo.value, customFields }
  }
}

const onCustomLabelBlur = (fieldKey: string, event: FocusEvent) => {
  const el = event.target as HTMLElement
  const text = el.innerText.trim() || '自定义字段'
  const id = getCustomId(fieldKey)
  const customFields = [...(basicInfo.value.customFields || [])]
  const idx = customFields.findIndex(f => f.id === id)
  if (idx !== -1) {
    customFields[idx] = { ...customFields[idx], label: text }
    basicInfo.value = { ...basicInfo.value, customFields }
  }
  // 同步 DOM，防止 contenteditable 内容与数据不一致
  if (el.innerText !== text) {
    el.innerText = text
  }
}

const isFieldHidden = (key: string): boolean => {
  if (!basicInfo.value) return false
  if (isCustomField(key)) {
    return getCustomField(key)?.hidden ?? false
  }
  return !!basicInfo.value.hiddenFields?.[key]
}

const isFieldInOrder = (key: string): boolean => {
  if (!basicInfo.value) return false
  const order = basicInfo.value.fieldOrder || DEFAULT_FIELD_ORDER
  return order.includes(key)
}

// 显示模式
const DISPLAY_MODE_ORDER: FieldDisplayMode[] = ['iconLabelValue', 'labelValue', 'iconValue']

const getDisplayMode = (key: string): FieldDisplayMode => {
  if (!basicInfo.value) return 'iconLabelValue'
  return basicInfo.value.fieldDisplayMode?.[key] || 'iconLabelValue'
}

const getDisplayModeIcon = (key: string): string => {
  const mode = getDisplayMode(key)
  if (mode === 'iconLabelValue') return 'mdi:format-list-bulleted'
  if (mode === 'labelValue') return 'mdi:format-text'
  return 'mdi:image-outline'
}

const getDisplayModeTitle = (key: string): string => {
  const mode = getDisplayMode(key)
  if (mode === 'iconLabelValue') return '图标+标签+值'
  if (mode === 'labelValue') return '标签+值'
  return '图标+值'
}

const cycleDisplayMode = (key: string) => {
  if (!basicInfo.value) return
  const current = getDisplayMode(key)
  const idx = DISPLAY_MODE_ORDER.indexOf(current)
  const next = DISPLAY_MODE_ORDER[(idx + 1) % DISPLAY_MODE_ORDER.length]
  const modes = { ...basicInfo.value.fieldDisplayMode }
  modes[key] = next
  basicInfo.value = { ...basicInfo.value, fieldDisplayMode: modes }
}

// 自定义字段辅助
const isCustomField = (key: string): boolean => key.startsWith('custom_')

const getCustomId = (key: string): string => key.replace('custom_', '')

const getCustomField = (key: string): CustomField | undefined => {
  if (!basicInfo.value) return undefined
  const id = getCustomId(key)
  return (basicInfo.value.customFields || []).find(f => f.id === id)
}

// 固定字段（姓名、职位，不可拖拽）
const fixedFields = ['name', 'title']

// 可拖拽的字段顺序（排除 photo/name/title），包装为对象以支持 vuedraggable item-key
const draggableFieldOrder = computed({
  get: () => {
    if (!basicInfo.value) return []
    const order = basicInfo.value.fieldOrder || [...DEFAULT_FIELD_ORDER]
    return order.filter(k => !['photo', 'name', 'title'].includes(k)).map((key, i) => ({ key, order: i }))
  },
  set: (newList: { key: string; order: number }[]) => {
    if (!basicInfo.value) return
    const fixedKeys = ['photo', 'name', 'title']
    const currentOrder = basicInfo.value.fieldOrder || [...DEFAULT_FIELD_ORDER]
    const fixedItems = currentOrder.filter(k => fixedKeys.includes(k))
    basicInfo.value = { ...basicInfo.value, fieldOrder: [...fixedItems, ...newList.map(item => item.key)] }
  }
})

// 字段操作
const toggleFieldVisibility = (field: string) => {
  if (!basicInfo.value) return
  if (isCustomField(field)) {
    const customFields = [...(basicInfo.value.customFields || [])]
    const id = getCustomId(field)
    const idx = customFields.findIndex(f => f.id === id)
    if (idx !== -1) {
      customFields[idx] = { ...customFields[idx], hidden: !customFields[idx].hidden }
      basicInfo.value = { ...basicInfo.value, customFields }
    }
    return
  }
  const hidden = { ...basicInfo.value.hiddenFields }
  hidden[field] = !hidden[field]
  basicInfo.value = { ...basicInfo.value, hiddenFields: hidden }
}

const handlePhotoUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    alert('图片大小不能超过 2MB')
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    compressAndOpenEditor(e.target?.result as string)
  }
  reader.readAsDataURL(file)
  input.value = ''
}

const compressAndOpenEditor = (dataUrl: string) => {
  const image = new Image()
  image.onload = () => {
    const maxDim = 800
    let { width, height } = image
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0, width, height)
    editingPhotoSrc.value = canvas.toDataURL('image/jpeg', 0.85)
    showPhotoEditor.value = true
  }
  image.src = dataUrl
}

const openPhotoEditor = () => {
  editingPhotoSrc.value = basicInfo.value?.photoOriginal || basicInfo.value?.photo || ''
  if (!editingPhotoSrc.value) return
  showPhotoEditor.value = true
}

const handlePhotoEditorConfirm = (result: { photo: string; photoShape: 'circle' | 'rectangle' }) => {
  basicInfo.value = { ...basicInfo.value, photo: result.photo, photoShape: result.photoShape, photoOriginal: editingPhotoSrc.value }
  showPhotoEditor.value = false
  editingPhotoSrc.value = ''
}

const deletePhoto = () => {
  basicInfo.value = { ...basicInfo.value, photo: '', photoShape: undefined, photoOriginal: undefined }
}

const addCustomField = () => {
  if (!basicInfo.value) return
  const field: CustomField = {
    id: generateId(),
    label: '自定义字段',
    value: '',
    hidden: false
  }
  const existing = basicInfo.value.customFields || []
  const newOrder = [...(basicInfo.value.fieldOrder || DEFAULT_FIELD_ORDER)]
  const customKey = `custom_${field.id}`
  newOrder.push(customKey)
  basicInfo.value = {
    ...basicInfo.value,
    customFields: [...existing, field],
    fieldOrder: newOrder
  }
}

const removeCustomField = (id: string) => {
  if (!basicInfo.value) return
  const existing = basicInfo.value.customFields || []
  const newOrder = (basicInfo.value.fieldOrder || DEFAULT_FIELD_ORDER).filter(k => k !== `custom_${id}`)
  basicInfo.value = {
    ...basicInfo.value,
    customFields: existing.filter(f => f.id !== id),
    fieldOrder: newOrder
  }
}
</script>

<style lang="scss" scoped>
.section {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-lg;
    padding-bottom: $spacing-md;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, $primary-color, transparent);
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: 700;
    color: $text-primary;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }
}

.title__icon {
  display: flex;
  color: $primary-light;
}

// 头像区域
.field-row {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  &__label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
}

.field-display-mode,
.field-toggle,
.field-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  color: $text-secondary;
  border: none;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    background: rgba($text-secondary, 0.15);
  }
}

.field-display-mode {
  color: $primary-light;

  &:hover {
    background: rgba($primary-color, 0.1);
  }
}

.field-delete {
  color: $error-color;

  &:hover {
    background: rgba($error-color, 0.15);
  }
}

.photo-upload {
  width: 100%;
}

.photo-row {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
}

.photo-preview {
  width: 80px;
  height: 80px;
  overflow: hidden;
  flex-shrink: 0;

  &--circle {
    border-radius: 50%;
  }

  &--rectangle {
    width: 60px;
    height: 80px;
    border-radius: 0;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.photo-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  padding: 0;

  &:hover {
    border-color: rgba($primary-color, 0.4);
    color: $text-primary;
    background: rgba($primary-color, 0.08);
  }

  &--danger:hover {
    border-color: rgba($error-color, 0.4);
    color: $error-color;
    background: rgba($error-color, 0.08);
  }
}

.photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
  width: 80px;
  height: 80px;
  border: 2px dashed $border-glass;
  border-radius: $radius-lg;
  cursor: pointer;
  color: $text-light;
  transition: all $transition-fast;

  &:hover {
    border-color: $primary-color;
    color: $primary-color;
    background: rgba($primary-color, 0.05);
  }

  span {
    font-size: 10px;
  }
}

.photo-input {
  display: none;
}

// 字段网格
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-sm $spacing-md;

  @include mobile {
    grid-template-columns: 1fr;
  }

  &--fixed {
    gap: $spacing-sm $spacing-md;
  }
}

.field-item {
  display: flex;
  align-items: flex-start;
  gap: $spacing-xs;
  border-radius: $radius-lg;
  padding: $spacing-xs;
  transition: all $transition-fast;

  &--fixed {
    // 固定字段无拖拽手柄
  }

  &--chosen {
    box-shadow: $shadow-sm;
    transform: scale(1.02);
    z-index: 10;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.2s ease;
  }

  &--drag {
    box-shadow: $shadow-lg;
    transform: scale(1.04);
    z-index: 100;
    opacity: 0.95;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.15s ease;
  }

  &--ghost {
    opacity: 0.3;
    background: rgba($primary-color, 0.05);
    border: 1px dashed $primary-color;
  }

  &__drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 28px;
    color: $text-light;
    cursor: grab;
    flex-shrink: 0;

    &:active {
      cursor: grabbing;
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }
}

.add-custom-field {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  color: $text-secondary;
  font-size: $font-size-sm;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family;

  &:hover {
    background: $bg-glass-hover;
    border-color: $primary-color;
    color: $primary-light;
  }
}

.custom-field__label-text {
  outline: none;
  cursor: text;
  border-bottom: 1px dashed transparent;
  transition: border-color $transition-fast;

  &:hover {
    border-bottom-color: rgba($text-secondary, 0.3);
  }

  &:focus {
    border-bottom-color: $primary-color;
  }
}

.display-controls {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: $bg-glass;
  border-radius: $radius-lg;
  border: 1px solid $border-glass;
  width: fit-content;
}

.layout-selector {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  &__label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    white-space: nowrap;
  }

  &__options {
    display: flex;
    gap: $spacing-xs;
  }
}

.layout-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  color: $text-secondary;

  &:hover {
    border-color: rgba($primary-color, 0.4);
    background: rgba($primary-color, 0.05);
  }

  &--active {
    border-color: $primary-color;
    background: rgba($primary-color, 0.1);
    color: $primary-color;
  }

  &__text {
    font-size: 10px;
    font-weight: 500;
  }
}
</style>
