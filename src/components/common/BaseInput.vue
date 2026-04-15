<template>
  <div class="base-input">
    <label v-if="label" class="base-input__label">{{ label }}</label>
    <div class="base-input__wrapper">
      <input
        class="base-input__field"
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        :disabled="disabled"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <span v-if="error" class="base-input__error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'date'
  placeholder?: string
  modelValue?: string
  disabled?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style lang="scss" scoped>

.base-input {
  margin-bottom: $spacing-md;

  &__label {
    display: block;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: $spacing-sm;
  }

  &__wrapper {
    position: relative;
  }

  &__field {
    @include input-base;
  }

  &__error {
    display: block;
    font-size: $font-size-xs;
    color: $error-color;
    margin-top: $spacing-xs;
  }
}
</style>