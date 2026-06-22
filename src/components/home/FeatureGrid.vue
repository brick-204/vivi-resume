<template>
  <section class="feature-grid">
    <div class="feature-grid__header">
      <h2 class="feature-grid__title">功能亮点</h2>
      <p class="feature-grid__subtitle">一站式简历编辑解决方案</p>
    </div>
    <div class="feature-grid__items">
      <div
        v-for="(feature, idx) in features"
        :key="feature.title"
        class="feature-card"
        :style="{ animationDelay: `${idx * 0.08}s` }"
      >
        <div class="feature-card__icon">
          <Icon :icon="feature.icon" :width="32" />
        </div>
        <div class="feature-card__title">{{ feature.title }}</div>
        <div class="feature-card__desc">{{ feature.desc }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const features = [
  { icon: 'mdi:palette-outline', title: '多模板支持', desc: '8 款专业模板，一键切换，风格多样' },
  { icon: 'mdi:creation', title: 'AI 帮帮', desc: '评估、扫描、优化、面试，一个入口搞定' },
  { icon: 'mdi:auto-fix', title: 'AI 智能润色', desc: '7 种 AI 文本操作，让表达更专业' },
  { icon: 'mdi:clipboard-check-outline', title: '简历评估', desc: 'AI 全方位评估打分，精准定位不足' },
  { icon: 'mdi:text-search', title: 'JD 匹配分析', desc: '智能关键词扫描，提升投递匹配度' },
  { icon: 'mdi:account-tie', title: '面试准备', desc: '生成面试题和复习要点，从容应战' },
  { icon: 'mdi:eye-outline', title: '实时预览', desc: '所见即所得编辑体验，边改边看' },
  { icon: 'mdi:download', title: '多格式导出', desc: 'PDF / 图片 / JSON 一键导出' },
  { icon: 'mdi:moon-waning-crescent', title: '深色模式', desc: '护眼深色主题，夜间编辑更舒适' },
  { icon: 'mdi:shield-check-outline', title: '数据安全', desc: '本地存储，隐私无忧，无需注册' },
]
</script>

<style lang="scss" scoped>
.feature-grid {
  padding: $spacing-3xl 0;
}

.feature-grid__header {
  text-align: center;
  margin-bottom: $spacing-2xl;
}

.feature-grid__title {
  font-size: $font-size-3xl;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $spacing-sm;

  @include mobile {
    font-size: $font-size-2xl;
  }
}

.feature-grid__subtitle {
  font-size: $font-size-lg;
  color: $text-secondary;
}

.feature-grid__items {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;

  @include tablet {
    grid-template-columns: repeat(2, 1fr);
  }

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.feature-card {
  @include glass-card;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: $spacing-xl $spacing-lg;
  animation: slide-up 0.6s ease both;
}

.feature-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: $radius-lg;
  background: rgba($primary-color, 0.08);
  color: $primary-light;
  margin-bottom: $spacing-md;
}

.feature-card__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-xs;
}

.feature-card__desc {
  font-size: $font-size-sm;
  color: $text-secondary;
  line-height: 1.5;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
