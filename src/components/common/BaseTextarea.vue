<template>
  <div class="base-textarea">
    <label v-if="label" class="base-textarea__label">{{ label }}</label>
    <textarea
      class="base-textarea__field"
      :placeholder="placeholder"
      :value="modelValue"
      :disabled="disabled"
      :rows="rows"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <span v-if="error" class="base-textarea__error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  placeholder?: string
  modelValue?: string
  disabled?: boolean
  rows?: number
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style lang="scss" scoped>

.base-textarea {
  margin-bottom: $spacing-md;

  &__label {
    display: block;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: $spacing-sm;
  }

  &__field {
    @include input-base;
    resize: vertical;
    min-height: 80px;
  }

  &__error {
    display: block;
    font-size: $font-size-xs;
    color: $error-color;
    margin-top: $spacing-xs;
  }
}
</style>