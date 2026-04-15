<template>
  <button
    class="base-button"
    :class="[`base-button--${variant}`, `base-button--${size}`]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span v-if="$slots.icon" class="base-button__icon">
      <slot name="icon" />
    </span>
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style lang="scss" scoped>

.base-button {
  @include button-base;

  &--primary {
    @include button-primary;
  }

  &--secondary {
    @include button-secondary;
  }

  &--danger {
    @include button-base;
    background: linear-gradient(135deg, $error-color, $primary-dark);
    color: $text-white;
    box-shadow: 0 4px 16px rgba($error-color, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba($error-color, 0.4);
    }
  }

  &--sm {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-xs;
  }

  &--md {
    padding: $spacing-sm $spacing-lg;
    font-size: $font-size-sm;
  }

  &--lg {
    padding: $spacing-md $spacing-xl;
    font-size: $font-size-md;
  }

  &__icon {
    display: inline-flex;
    margin-right: $spacing-xs;
    font-size: 16px;
  }
}
</style>