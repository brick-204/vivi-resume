<template>
  <div class="home">
    <!-- 流动光球背景 -->
    <div class="home__bg">
      <div class="orb orb--purple"></div>
      <div class="orb orb--cyan"></div>
      <div class="orb orb--pink"></div>
      <div class="orb orb--amber"></div>
      <!-- 网格线装饰 -->
      <div class="grid-overlay"></div>
    </div>

    <!-- 头部 -->
    <header class="home__header">
      <div class="header__container">
        <div class="header__logo">
          <div class="logo__icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect
                x="2"
                y="2"
                width="28"
                height="28"
                rx="8"
                stroke="url(#logo-gradient)"
                stroke-width="2"
              />
              <path
                d="M10 12H22M10 16H18M10 20H22"
                stroke="url(#logo-gradient)"
                stroke-width="2"
                stroke-linecap="round"
              />
              <defs>
                <linearGradient
                  id="logo-gradient"
                  x1="2"
                  y1="2"
                  x2="30"
                  y2="30"
                >
                  <stop stop-color="#7c5cfc" />
                  <stop offset="1" stop-color="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="logo__text">Vivi Resume</span>
        </div>
        <div class="header__badge">
          <span class="badge__dot"></span>
          在线简历编辑器
        </div>
      </div>
    </header>

    <!-- 主区域 -->
    <main class="home__main">
      <!-- Hero区域 -->
      <section class="hero">
        <div class="hero__content">
          <div class="hero__label">
            <span class="label__icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1L10.5 5.5L15.5 6L12 9.5L13 14.5L8 12L3 14.5L4 9.5L0.5 6L5.5 5.5L8 1Z"
                  fill="url(#star-gradient)"
                />
                <defs>
                  <linearGradient
                    id="star-gradient"
                    x1="0.5"
                    y1="1"
                    x2="15.5"
                    y2="14.5"
                  >
                    <stop stop-color="#fbbf24" />
                    <stop offset="1" stop-color="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            打造令人印象深刻的个人简历
          </div>
          <h1 class="hero__title">
            <span class="hero__title-line">让每一次</span>
            <span class="hero__title-line">
              <span class="hero__title-highlight">机会</span>
              <span class="hero__title-line">触手可及</span>
            </span>
          </h1>
          <p class="hero__desc">
            简洁优雅的在线简历编辑器，帮助你展现最好的自己
          </p>
          <div class="hero__actions">
            <button
              class="action-btn action-btn--primary"
              @click="createNewResume"
            >
              <span class="btn__icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 4V16M4 10H16"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              创建新简历
            </button>
            <button
              class="action-btn action-btn--secondary"
              @click="showImportModal = true"
            >
              <span class="btn__icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 3V13M10 13L6 9M10 13L14 9"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M3 17H17"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              导入简历
            </button>
          </div>
        </div>
        <div class="hero__visual">
          <div class="hero__card hero__card--1">
            <div class="preview-card">
              <div class="preview-card__header">
                <div class="preview-card__avatar"></div>
                <div class="preview-card__info">
                  <span class="preview-card__name">张三</span>
                  <span class="preview-card__title">前端工程师</span>
                </div>
              </div>
              <div class="preview-card__skills">
                <span class="skill-tag">Vue</span>
                <span class="skill-tag">React</span>
                <span class="skill-tag">TypeScript</span>
              </div>
            </div>
          </div>
          <div class="hero__card hero__card--2">
            <div class="preview-card preview-card--accent">
              <div class="preview-card__header">
                <div class="preview-card__avatar"></div>
                <div class="preview-card__info">
                  <span class="preview-card__name">李四</span>
                  <span class="preview-card__title">产品经理</span>
                </div>
              </div>
              <div class="preview-card__skills">
                <span class="skill-tag">需求分析</span>
                <span class="skill-tag">项目管理</span>
              </div>
            </div>
          </div>
          <div class="hero__card hero__card--3">
            <div class="preview-card preview-card--secondary">
              <div class="preview-card__header">
                <div class="preview-card__avatar"></div>
                <div class="preview-card__info">
                  <span class="preview-card__name">王五</span>
                  <span class="preview-card__title">UX 设计师</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 简历列表 -->
      <section v-if="store.resumeCount === 0" class="empty-section">
        <div class="empty__content">
          <div class="empty__icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect
                x="10"
                y="10"
                width="60"
                height="60"
                rx="16"
                stroke="url(#empty-gradient)"
                stroke-width="2"
                stroke-dasharray="4 4"
              />
              <path
                d="M28 35H52M28 45H44"
                stroke="url(#empty-gradient)"
                stroke-width="2"
                stroke-linecap="round"
              />
              <defs>
                <linearGradient
                  id="empty-gradient"
                  x1="10"
                  y1="10"
                  x2="70"
                  y2="70"
                >
                  <stop stop-color="#7c5cfc" />
                  <stop offset="1" stop-color="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p class="empty__text">还没有简历，点击上方按钮开始创建</p>
        </div>
      </section>

      <section v-else class="resume-section">
        <h2 class="section__title">
          <svg
            class="title__icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>
          我的简历
          <span class="title__count">{{ store.resumeCount }}</span>
        </h2>
        <div class="resume-grid">
          <ResumeCard
            v-for="resume in store.resumeList"
            :key="resume.id"
            :resume="resume"
            @edit="openResume(resume.id)"
            @copy="onCopyResume(resume.id)"
            @delete="onDeleteResume(resume.id)"
          />
        </div>
      </section>
    </main>

    <!-- 导入简历弹窗 -->
    <ImportModal
      :visible="showImportModal"
      @close="showImportModal = false"
      @import="handleImportFile"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref } from "vue";
import { useResumeStore } from "@/stores/resumeStore";
import { readJSONFile } from "@/utils/export";
import { message, dialog } from "@/plugins/naive-ui";
import ImportModal from "@/components/home/ImportModal.vue";
import ResumeCard from "@/components/home/ResumeCard.vue";

const router = useRouter();
const store = useResumeStore();
const showImportModal = ref(false);

const createNewResume = async () => {
  const id = await store.createResume();
  router.push(`/templates/${id}`);
};

const openResume = (id: string) => {
  router.push(`/editor/${id}`);
};

const onDeleteResume = async (id: string) => {
  dialog.warning({
    title: '删除简历',
    content: '确定要删除这个简历吗？此操作不可撤销。',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.deleteResume(id);
    },
  });
};

const onCopyResume = async (id: string) => {
  try {
    await store.copyResume(id);
  } catch (e) {
    console.error("复制简历失败:", e);
    message.error("复制失败，请重试");
  }
};

const handleImportFile = async (file: File) => {
  try {
    const json = await readJSONFile(file);
    if (await store.importFromJSON(json)) {
      showImportModal.value = false;
      message.success("导入成功！");
    } else {
      message.error("导入失败，请检查文件格式");
    }
  } catch (e) {
    message.error("导入失败：" + (e as Error).message);
  }
};
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  background: $bg-secondary;
  position: relative;
  overflow: hidden;
}

// 背景装饰
.home__bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: float 12s ease-in-out infinite;

  &--purple {
    width: 500px;
    height: 500px;
    background: radial-gradient(
      circle,
      rgba(124, 92, 252, 0.4) 0%,
      transparent 70%
    );
    top: -150px;
    right: -100px;
    animation-delay: 0s;
  }

  &--cyan {
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(6, 182, 212, 0.35) 0%,
      transparent 70%
    );
    bottom: 10%;
    left: -100px;
    animation-delay: -3s;
  }

  &--pink {
    width: 300px;
    height: 300px;
    background: radial-gradient(
      circle,
      rgba(244, 114, 182, 0.25) 0%,
      transparent 70%
    );
    top: 40%;
    right: 5%;
    animation-delay: -6s;
  }

  &--amber {
    width: 250px;
    height: 250px;
    background: radial-gradient(
      circle,
      rgba(251, 191, 36, 0.2) 0%,
      transparent 70%
    );
    bottom: 30%;
    right: 30%;
    animation-delay: -9s;
  }
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

// 头部
.home__header {
  position: relative;
  z-index: 10;
  padding: $spacing-lg $spacing-2xl;
}

.header__container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header__logo {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.logo__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo__text {
  font-size: $font-size-xl;
  font-weight: 700;
  @include gradient-text;
  letter-spacing: -0.02em;
}

.header__badge {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  background: $bg-glass;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid $border-glass;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: $text-secondary;
  font-weight: 500;
}

.badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $success-color;
  box-shadow: 0 0 8px $success-color;
  animation: pulse-glow 2s ease-in-out infinite;
}

// 主区域
.home__main {
  position: relative;
  z-index: 10;
  padding: $spacing-xl $spacing-2xl 20px;
  max-width: 1400px;
  margin: 0 auto;
}

// Hero区域
.hero {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: $spacing-3xl;
  align-items: center;
  padding: $spacing-2xl 0;

  @include tablet {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

.hero__content {
  @include tablet {
    order: 1;
  }
}

.hero__label {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  background: $bg-glass;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid $border-glass;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: $spacing-xl;
  @include animate-slide-up(0.1s);
}

.label__icon {
  display: flex;
}

.hero__title {
  margin-bottom: $spacing-lg;
  @include animate-slide-up(0.2s);
}

.hero__title-line {
  display: block;
  font-size: $font-size-4xl;
  color: $text-primary;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.hero__title-highlight {
  @include gradient-text;
  font-weight: 800;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 8px;
    background: linear-gradient(
      90deg,
      rgba(124, 92, 252, 0.3),
      rgba(6, 182, 212, 0.3)
    );
    border-radius: $radius-full;
    z-index: -1;
  }
}

.hero__desc {
  font-size: $font-size-lg;
  color: $text-secondary;
  margin-bottom: $spacing-xl;
  max-width: 480px;
  line-height: 1.7;

  @include tablet {
    max-width: 100%;
  }

  @include animate-slide-up(0.3s);
}

.hero__actions {
  display: flex;
  gap: $spacing-md;

  @include tablet {
    justify-content: center;
  }

  @include animate-slide-up(0.4s);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-xl;
  border-radius: $radius-lg;
  font-size: $font-size-md;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: none;
  font-family: $font-family;

  &--primary {
    background: $primary-gradient;
    color: $text-white;
    box-shadow:
      $shadow-primary,
      0 0 40px rgba(124, 92, 252, 0.2);

    &:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow:
        0 8px 32px rgba(124, 92, 252, 0.4),
        0 0 60px rgba(124, 92, 252, 0.25);
    }
  }

  &--secondary {
    background: $bg-glass;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: $text-primary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
      border-color: $primary-color;
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(124, 92, 252, 0.2);
    }
  }

  .btn__icon {
    display: flex;
  }
}

// Hero视觉区域
.hero__visual {
  position: relative;
  height: 320px;

  @include tablet {
    display: none;
  }
}

.hero__card {
  position: absolute;
  transition: all $transition-spring;

  &--1 {
    top: 20px;
    left: 60px;
    transform: rotate(-6deg);
    animation: float 8s ease-in-out infinite;
  }

  &--2 {
    top: 70px;
    right: 30px;
    transform: rotate(4deg);
    animation: float 10s ease-in-out infinite;
    animation-delay: -2s;
  }

  &--3 {
    bottom: 30px;
    left: 20px;
    transform: rotate(2deg);
    animation: float 9s ease-in-out infinite;
    animation-delay: -4s;
  }

  &:hover {
    transform: rotate(0deg) translateY(-12px) scale(1.03);
    z-index: 10;
  }
}

.preview-card {
  @include glass-card;
  width: 240px;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-md;
  }

  &__avatar {
    width: 44px;
    height: 44px;
    border-radius: $radius-lg;
    background: linear-gradient(135deg, $primary-color, $secondary-color);
  }

  &__info {
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: 700;
    color: $text-primary;
  }

  &__title {
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  &__skills {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &--accent {
    border-color: rgba(244, 114, 182, 0.3);
    box-shadow:
      $shadow-md,
      0 0 30px rgba(244, 114, 182, 0.1);

    .preview-card__avatar {
      background: linear-gradient(135deg, $accent-color, $accent-light);
    }
  }

  &--secondary {
    border-color: rgba(6, 182, 212, 0.3);
    box-shadow:
      $shadow-md,
      0 0 30px rgba(6, 182, 212, 0.1);

    .preview-card__avatar {
      background: linear-gradient(135deg, $secondary-color, $secondary-light);
    }
  }
}

.skill-tag {
  padding: $spacing-xs $spacing-sm;
  background: rgba(124, 92, 252, 0.15);
  color: $primary-light;
  border: 1px solid rgba(124, 92, 252, 0.2);
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 500;
}

// 空状态
.empty-section {
  text-align: center;
  padding: $spacing-3xl 0;
}

.empty__content {
  @include animate-fade-in(0.5s);
}

.empty__icon {
  margin-bottom: $spacing-lg;
  opacity: 0.6;
}

.empty__text {
  font-size: $font-size-md;
  color: $text-light;
}

// 简历列表区域
.resume-section {
  padding: $spacing-xl 0;
}

.section__title {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  font-size: $font-size-xl;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-xl;
  @include animate-slide-up(0.4s);
}

.title__icon {
  color: $text-secondary;
}

.title__count {
  padding: $spacing-xs $spacing-md;
  background: $primary-gradient;
  color: $text-white;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  font-weight: 600;
}

// 简历网格
.resume-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-auto-rows: min-content;
  gap: $spacing-xl;
}
</style>
