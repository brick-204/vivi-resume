<script setup lang="ts">
/**
 * 月份选择器组件
 * ponytail: 封装 n-date-picker 的重复配置，替代 5 个 section 编辑器中的 15 行重复代码
 */
import { computed } from 'vue'
import { NDatePicker } from 'naive-ui'
import { parseMonthValue, formatMonthValue } from '@/utils/datePicker'

const props = defineProps<{
  value: string // 'YYYY-MM' 格式
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:value', val: string): void
}>()

const timestamp = computed(() => parseMonthValue(props.value))

const handleUpdate = (val: number | null) => {
  emit('update:value', formatMonthValue(val))
}
</script>

<template>
  <n-date-picker
    :value="timestamp"
    type="month"
    size="small"
    placeholder="选择年月"
    :clearable="true"
    :disabled="props.disabled"
    @update:value="handleUpdate"
  />
</template>