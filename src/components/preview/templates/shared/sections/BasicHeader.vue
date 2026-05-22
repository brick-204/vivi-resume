<template>
  <header class="resume__header" data-section="basic" @click="emit('click-section', 'basic')">
    <!-- 头像 -->
    <div v-if="ctx.resume.basicInfo.photo && ctx.isFieldVisible('photo')" class="header__photo">
      <img :src="ctx.resume.basicInfo.photo" :alt="ctx.resume.basicInfo.name" class="header__photo-img" />
    </div>
    <h1 v-if="ctx.resume.basicInfo.name && ctx.isFieldVisible('name')" class="header__name">{{ ctx.resume.basicInfo.name }}</h1>
    <p v-if="ctx.resume.basicInfo.title && ctx.isFieldVisible('title')" class="header__title">{{ ctx.resume.basicInfo.title }}</p>

    <!-- 统一字段列表 -->
    <div v-if="ctx.orderedAllFields.value.length" class="header__fields">
      <span v-for="field in ctx.orderedAllFields.value" :key="field.key" class="header__field">
        <Icon v-if="field.showIcon" :icon="field.icon" :width="14" :height="14" class="header__field-icon" />
        <span v-if="field.showLabel" class="header__field-label">{{ field.label }}</span>
        <span class="header__field-value">{{ field.value }}</span>
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
