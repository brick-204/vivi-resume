<template>
  <div class="section basic-info">
    <h3 class="section__title">
      <span class="title__icon">
        <Icon :icon="USER_ICON" :width="18" :height="18" />
      </span>
      基本信息
    </h3>
    <div class="section__form">
      <!-- 头像 -->
      <div class="photo-field">
        <div class="photo-field__label">头像</div>
        <div class="photo-field__content">
          <div class="photo-field__preview">
            <img v-if="basicInfo.photo" :src="basicInfo.photo" alt="头像预览" />
            <div v-else class="photo-field__placeholder">
              <Icon :icon="ACCOUNT_ICON" :width="28" :height="28" />
            </div>
          </div>
          <div class="photo-field__actions">
            <label class="upload-btn">
              <input type="file" accept="image/*" @change="handlePhotoUpload" hidden />
              <Icon :icon="UPLOAD_ICON" :width="16" :height="16" />
              上传图片
            </label>
            <button v-if="basicInfo.photo" class="clear-btn" @click="clearPhoto">
              <Icon :icon="CLOSE_ICON" :width="14" :height="14" />
              清除
            </button>
          </div>
        </div>
      </div>
      <BaseInput
        v-model="basicInfo.name"
        label="姓名"
        placeholder="请输入你的姓名"
      />
      <BaseInput
        v-model="basicInfo.title"
        label="职位"
        placeholder="如：高级前端工程师"
      />
      <BaseInput
        v-model="basicInfo.email"
        label="邮箱"
        type="email"
        placeholder="example@email.com"
      />
      <BaseInput
        v-model="basicInfo.phone"
        label="手机号"
        type="tel"
        placeholder="138-xxxx-xxxx"
      />
      <BaseInput
        v-model="basicInfo.location"
        label="所在地"
        placeholder="如：北京"
      />
      <BaseInput
        v-model="basicInfo.website"
        label="个人网站"
        type="url"
        placeholder="https://example.com"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { USER_ICON, ACCOUNT_ICON, UPLOAD_ICON, CLOSE_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import BaseInput from '@/components/common/BaseInput.vue'

const store = useResumeStore()

const basicInfo = computed({
  get: () => store.currentResume?.basicInfo || {
    name: '',
    title: '',
    photo: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    summary: ''
  },
  set: (value) => store.updateCurrentResume({ basicInfo: value })
})

// 处理图片上传
const handlePhotoUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    // 限制文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB')
      input.value = ''
      return
    }

    // 转为 base64
    const reader = new FileReader()
    reader.onload = (e) => {
      basicInfo.value = { ...basicInfo.value, photo: e.target?.result as string }
    }
    reader.readAsDataURL(file)
  }
  input.value = '' // 清空以便重复上传
}

// 清除头像
const clearPhoto = () => {
  basicInfo.value = { ...basicInfo.value, photo: '' }
}
</script>

<style lang="scss" scoped>

.section {
  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: 700;
    color: $text-primary;
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

  &__form {
    max-width: 100%;
  }
}

.title__icon {
  display: flex;
  color: $primary-light;
}

.photo-field {
  margin-bottom: $spacing-md;

  &__label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: $spacing-xs;
  }

  &__content {
    display: flex;
    align-items: flex-end;
    gap: $spacing-md;
  }

  &__preview {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__placeholder {
    color: $text-light;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
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

  svg {
    flex-shrink: 0;
  }
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  background: transparent;
  border: 1px solid rgba($error-color, 0.3);
  border-radius: $radius-sm;
  color: $error-color;
  font-size: $font-size-xs;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family;

  &:hover {
    background: $error-color;
    color: $text-white;
  }

  svg {
    flex-shrink: 0;
  }
}
</style>