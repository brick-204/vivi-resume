<template>
  <!-- 满宽顶部横条（top-bar）：AppHeader 下方 -->
  <button
    v-if="position === 'top-bar' && shouldShow"
    class="upcoming-banner upcoming-banner--bar"
    :class="`upcoming-banner--${urgencyLevel}`"
    :title="`查看「${interview?.company}」面试详情`"
    @click="goToInterviews"
  >
    <Icon icon="mdi:timer-sand" :width="16" class="upcoming-banner__icon" />
    <span class="upcoming-banner__countdown">{{ countdownText }}</span>
    <span class="upcoming-banner__sep">·</span>
    <span class="upcoming-banner__scheduled">{{ scheduledText }}</span>
    <span class="upcoming-banner__sep">·</span>
    <span class="upcoming-banner__company">{{ interview?.company || '未填写公司' }}</span>
    <span class="upcoming-banner__sep">·</span>
    <span class="upcoming-banner__round">{{ nextRound?.roundType || '待面' }}</span>
    <span class="upcoming-banner__sep">·</span>
    <span class="upcoming-banner__cta">查看 →</span>
  </button>

  <!-- nav 顶部矩形卡（nav-top）：嵌在 SidebarNav 内部顶部，三行布局适配窄侧边栏 -->
  <button
    v-else-if="position === 'nav-top' && shouldShow"
    class="upcoming-banner upcoming-banner--nav"
    :class="`upcoming-banner--${urgencyLevel}`"
    :title="`查看「${interview?.company}」面试详情`"
    @click="goToInterviews"
  >
    <div class="upcoming-banner__countdown upcoming-banner__countdown--stack">
      <Icon icon="mdi:timer-sand" :width="16" class="upcoming-banner__icon" />
      <span>{{ countdownText }}</span>
    </div>
    <div class="upcoming-banner__scheduled upcoming-banner__scheduled--line">{{ scheduledText }}</div>
    <div class="upcoming-banner__meta">
      <span class="upcoming-banner__company">{{ interview?.company || '未填写公司' }}</span>
      <span class="upcoming-banner__sep">·</span>
      <span class="upcoming-banner__round">{{ nextRound?.roundType || '待面' }}</span>
      <span class="upcoming-banner__sep">·</span>
      <span class="upcoming-banner__cta">查看 →</span>
    </div>
  </button>

  <!-- 左/右下角悬浮卡（bottom-left / bottom-right）：fixed，三行布局加高避免横向过长 -->
  <button
    v-else-if="isCorner && shouldShow"
    class="upcoming-banner upcoming-banner--corner"
    :class="[`upcoming-banner--${urgencyLevel}`, `upcoming-banner--${position}`]"
    :title="`查看「${interview?.company}」面试详情`"
    @click="goToInterviews"
  >
    <div class="upcoming-banner__countdown upcoming-banner__countdown--stack">
      <Icon icon="mdi:timer-sand" :width="16" class="upcoming-banner__icon" />
      <span>{{ countdownText }}</span>
    </div>
    <div class="upcoming-banner__scheduled upcoming-banner__scheduled--line">{{ scheduledText }}</div>
    <div class="upcoming-banner__meta">
      <span class="upcoming-banner__company">{{ interview?.company || '未填写公司' }}</span>
      <span class="upcoming-banner__sep">·</span>
      <span class="upcoming-banner__round">{{ nextRound?.roundType || '待面' }}</span>
      <span class="upcoming-banner__sep">·</span>
      <span class="upcoming-banner__cta">查看 →</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useInterviewStore } from '@/stores/interviewStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useNextRoundCountdown } from '@/composables/useNextRoundCountdown'
import { formatInterviewDate } from '@/utils/timestamp'
import { Icon } from '@iconify/vue'
import type { InterviewBannerPosition } from '@/utils/storageAdapter'

const router = useRouter()
const interviewStore = useInterviewStore()
const { ongoingInterviews } = storeToRefs(interviewStore)
const settingsStore = useSettingsStore()
const { interviewBannerEnabled, interviewBannerPosition } = storeToRefs(settingsStore)

const position = computed<InterviewBannerPosition>(() => interviewBannerPosition.value)
const isCorner = computed(() => position.value === 'bottom-left' || position.value === 'bottom-right')

/**
 * 「最近的待面」= 进行中段第一条（store 已按下一面紧迫度升序排好）。
 * 仅当该条确有未来 scheduledAt 轮次且 ≤3 天时才显示——
 * composable 的 urgencyLevel 为 null 时 shouldShow 为 false，三种模板均不渲染。
 */
const interview = computed(() => ongoingInterviews.value[0] ?? null)
const { nextRound, countdownText, urgencyLevel } = useNextRoundCountdown(() => interview.value)

/** 具体面试时间「MM-DD 周X HH:MM」——复用 formatInterviewDate，与卡片一致 */
const scheduledText = computed(() => formatInterviewDate(nextRound.value?.scheduledAt, true))

// 开关开 + 有紧迫度（≤3天且有未来轮次）才显示
const shouldShow = computed(() => interviewBannerEnabled.value && urgencyLevel.value !== null)

const goToInterviews = () => {
  router.push({ path: '/dashboard', query: { tab: 'interviews' } })
}
</script>

<style lang="scss" scoped>
// ponytail: 单组件按 position 切 4 套渲染：bar(满宽顶条) / nav(nav 内顶矩形卡) / corner(左下/右下悬浮卡)
// 颜色分档共用：soon 蓝 / near 橙 / urgent 红+脉冲

@mixin level-colors($bg, $color, $border) {
  background: $bg;
  color: $color;
  border-color: $border;
}

.upcoming-banner {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-family: $font-family;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
  border: 1px solid transparent;
  white-space: nowrap;

  &__icon {
    flex-shrink: 0;
  }

  &__countdown {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    letter-spacing: 0.02em;

    &--stack {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      font-size: $font-size-lg;
    }
  }

  &__sep {
    opacity: 0.5;
    flex-shrink: 0;
  }

  &__company {
    min-width: 0; // flex 子项默认 min-width:auto 会撑爆父级，置 0 才能触发 ellipsis
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__round {
    flex-shrink: 1; // 允许收缩，长轮次名省略而非溢出
    min-width: 0;
    max-width: 7em;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__cta,
  &__scheduled {
    flex-shrink: 0;
  }

  &__cta {
    opacity: 0.85;
  }

  // corner 三行布局里日期单独成行：介于倒计时(大)与 meta(xs)之间
  &__scheduled--line {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    font-variant-numeric: tabular-nums;
    opacity: 0.92;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    opacity: 0.9;
    overflow: hidden;
    min-width: 0; // 解除 flex 撑爆，让内部 company/round 可 ellipsis
    width: 100%; // nav/corner 窄容器内占满，配合 company flex:1 收缩
  }

  // ========== 形态：满宽顶条 ==========
  &--bar {
    justify-content: center;
    width: 100%;
    padding: $spacing-xs $spacing-lg;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    font-size: $font-size-sm;

    // 长公司名可收缩省略，不顶飞后续的「查看 →」；短文本不主动撑开，保持居中
    .upcoming-banner__company {
      flex: 0 1 auto;
      max-width: 40%;
    }

    &:hover {
      filter: brightness(1.05);
    }
  }

  // ========== 形态：nav 内顶部矩形卡（嵌 SidebarNav 内部） ==========
  &--nav {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;
    box-shadow: $shadow-sm;
    margin-bottom: $spacing-md;

    // 窄侧边栏内：公司名吃剩余空间省略，轮次名已全局 max-width 省略
    .upcoming-banner__company {
      flex: 1 1 0;
    }

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }
  }

  // ========== 形态：左/右下角悬浮卡 ==========
  &--corner {
    position: fixed;
    bottom: $spacing-lg;
    z-index: 90;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-lg;
    box-shadow: $shadow-md;
    // ponytail: banner fixed 在 left:$spacing-lg(24px)，nav 宽 240px；
    // max-width 留出与 nav 右边界的间距(200px→右边界224px，距nav 240px 留16px)，不贴边框
    max-width: 200px;
    overflow: hidden; // 兜底：固定格式文本(倒计时/日期)超长时裁剪而非撑破

    // 角落悬浮卡：公司名吃剩余空间省略
    .upcoming-banner__company {
      flex: 1 1 0;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: $shadow-lg;
    }

    &.upcoming-banner--bottom-left {
      left: $spacing-lg;
    }
    &.upcoming-banner--bottom-right {
      right: $spacing-lg;
    }
  }

  // ========== 颜色分档 ==========
  &--soon {
    @include level-colors(rgba(52, 152, 219, 0.16), #3498db, rgba(52, 152, 219, 0.45));
  }
  &--near {
    @include level-colors(rgba(243, 156, 18, 0.16), #f39c12, rgba(243, 156, 18, 0.45));
  }
  &--urgent {
    @include level-colors(rgba(231, 76, 60, 0.18), #e74c3c, rgba(231, 76, 60, 0.5));
    animation: urgent-pulse 1.6s ease-in-out infinite;
  }
}

@keyframes urgent-pulse {
  0%, 100% { box-shadow: $shadow-md, 0 0 0 0 rgba(231, 76, 60, 0.4); }
  50% { box-shadow: $shadow-md, 0 0 0 6px rgba(231, 76, 60, 0); }
}

// 响应式：仅 tablet，无 mobile
@include tablet {
  .upcoming-banner {
    &--corner {
      bottom: $spacing-md;
      max-width: 220px;

      &.upcoming-banner--bottom-left {
        left: $spacing-md;
      }
      &.upcoming-banner--bottom-right {
        right: $spacing-md;
      }
    }

    // ponytail: tablet 侧边栏缩到 64px，nav 形态卡缩窄、字号缩小、meta 折行
    &--nav {
      padding: $spacing-xs $spacing-sm;
      font-size: $font-size-xs;

      .upcoming-banner__countdown--stack {
        font-size: $font-size-md;
      }

      .upcoming-banner__scheduled--line {
        font-size: $font-size-xs;
      }

      .upcoming-banner__meta {
        flex-wrap: wrap;
        gap: 2px;
      }
    }
  }
}
</style>
