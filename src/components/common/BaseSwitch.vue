<template>
  <label class="base-switch" :class="{ 'base-switch--disabled': disabled }">
    <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="onChange" />
    <span class="base-switch__track">
      <span class="base-switch__thumb" />
    </span>
    <span class="base-switch__label"><slot /></span>
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
.base-switch {
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

  &__track {
    position: relative;
    width: 32px;
    height: 18px;
    border-radius: 9px;
    background: $bg-glass;
    border: 1px solid $border-glass;
    transition: all $transition-fast;
    flex-shrink: 0;
  }

  &:hover &__track {
    border-color: rgba($primary-color, 0.4);
  }

  input:checked + &__track {
    background: rgba($primary-color, 0.3);
    border-color: rgba($primary-color, 0.5);
  }

  &__thumb {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: $text-light;
    transition: all $transition-fast;
  }

  input:checked + &__track &__thumb {
    left: 15px;
    background: $primary-color;
  }

  &__label {
    font-size: $font-size-xs;
    color: $text-secondary;
  }
}
</style>
