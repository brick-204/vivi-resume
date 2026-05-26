<template>
  <label class="base-checkbox" :class="{ 'base-checkbox--disabled': disabled }">
    <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="onChange" />
    <span class="base-checkbox__box">
      <svg v-if="modelValue" width="12" height="12" viewBox="0 0 12 12">
        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span class="base-checkbox__label"><slot /></span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const onChange = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).checked)
}
</script>

<style lang="scss" scoped>
.base-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  cursor: pointer;
  user-select: none;

  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  input {
    display: none;
  }

  &__box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: $radius-sm;
    border: 1px solid $border-glass;
    background: $bg-glass;
    color: #ffffff;
    transition: all $transition-fast;
    flex-shrink: 0;
  }

  &:hover &__box {
    border-color: rgba($primary-color, 0.5);
  }

  input:checked + &__box {
    background: $primary-color;
    border-color: $primary-color;
  }

  &__label {
    font-size: $font-size-xs;
    color: $text-secondary;
  }
}
</style>
