<template>
  <div class="section skills">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <Icon :icon="ZAP_ICON" :width="18" :height="18" />
        </span>
        技能
      </h3>
    </div>

    <div class="skills-content">
      <BaseTextarea
        v-model="content"
        placeholder="请列举你的技能，每行一个，例如：&#10;Vue / React&#10;TypeScript&#10;Node.js"
        :rows="6"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { ZAP_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'

const store = useResumeStore()

const content = computed({
  get: () => store.currentResume?.skills?.[0]?.content || '',
  set: (value) => {
    store.updateCurrentResume({
      skills: [{ id: 'skills-text', content: value }]
    })
  }
})
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
      background: linear-gradient(90deg, $yellow-color, transparent);
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
}

.title__icon {
  display: flex;
  color: $yellow-color;
}

.skills-content {
  :deep(.base-textarea) {
    min-height: 150px;
  }
}
</style>
