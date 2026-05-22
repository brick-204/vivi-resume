<template>
  <header class="resume__header" data-section="basic" @click="emit('click-section', 'basic')">
    <!-- 头像 -->
    <div v-if="ctx.resume.basicInfo.photo && ctx.isFieldVisible('photo')" class="header__photo">
      <img :src="ctx.resume.basicInfo.photo" :alt="ctx.resume.basicInfo.name" class="header__photo-img" />
    </div>
    <h1 v-if="ctx.resume.basicInfo.name && ctx.isFieldVisible('name')" class="header__name">{{ ctx.resume.basicInfo.name }}</h1>
      <p v-if="ctx.resume.basicInfo.title && ctx.isFieldVisible('title')" class="header__title">{{ ctx.resume.basicInfo.title }}</p>
      <div class="header__tags">
        <span v-for="fieldKey in ctx.orderedTagFields.value" :key="fieldKey" class="header__tag">
          <Icon v-if="ctx.showIcon(fieldKey)" :icon="ctx.getFieldIcon(fieldKey)" :width="12" :height="12" class="header__tag-icon" />
          <span v-if="ctx.showLabel(fieldKey)" class="header__tag-label">{{ ctx.getFieldLabel(fieldKey) }}</span>
          {{ ctx.getFieldValue(fieldKey) }}
        </span>
      </div>
    <div class="header__contact">
      <span v-for="fieldKey in ctx.orderedContactFields.value" :key="fieldKey" class="contact__item">
        <span v-if="ctx.showIcon(fieldKey)" class="contact__icon">
          <Icon :icon="ctx.getFieldIcon(fieldKey)" :width="14" :height="14" />
        </span>
        <span v-if="ctx.showLabel(fieldKey)">{{ ctx.getFieldLabel(fieldKey) }}:</span>
        {{ ctx.getFieldValue(fieldKey) }}
      </span>
      <span v-for="fieldKey in ctx.orderedCustomContactFields.value" :key="fieldKey" class="contact__item">
        <span v-if="ctx.showIcon(fieldKey)" class="contact__icon">
          <Icon :icon="ctx.getFieldIcon(fieldKey)" :width="14" :height="14" />
        </span>
        <span v-if="ctx.showLabel(fieldKey)">{{ ctx.getCustomFieldByKey(fieldKey)?.label }}:</span>
        {{ ctx.getCustomFieldByKey(fieldKey)?.value }}
      </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'
import { Icon } from '@iconify/vue'

const emit = defineEmits<{ 'click-section': [tabId: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
