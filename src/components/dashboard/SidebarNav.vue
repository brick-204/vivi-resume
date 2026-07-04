<template>
  <aside class="sidebar-nav" :class="{ 'sidebar-nav--mobile': mobile }">
    <!-- 导航项 -->
    <nav class="sidebar-nav__items">
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'resumes' }"
        :aria-current="activeTab === 'resumes' ? 'page' : undefined"
        @click="$emit('update:activeTab', 'resumes')"
      >
        <Icon icon="mdi:file-document-outline" :width="20" />
        <span class="sidebar-nav__item-label">我的简历</span>
      </button>
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'templates' }"
        :aria-current="activeTab === 'templates' ? 'page' : undefined"
        @click="$emit('update:activeTab', 'templates')"
      >
        <Icon icon="mdi:view-grid-outline" :width="20" />
        <span class="sidebar-nav__item-label">模版市场</span>
      </button>
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'ai' }"
        :aria-current="activeTab === 'ai' ? 'page' : undefined"
        @click="$emit('update:activeTab', 'ai')"
      >
        <Icon icon="mdi:robot-outline" :width="20" />
        <span class="sidebar-nav__item-label">AI 服务</span>
      </button>
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'trash' }"
        :aria-current="activeTab === 'trash' ? 'page' : undefined"
        @click="$emit('update:activeTab', 'trash')"
      >
        <Icon icon="mdi:delete-outline" :width="20" />
        <span class="sidebar-nav__item-label">回收站</span>
      </button>
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'settings' }"
        :aria-current="activeTab === 'settings' ? 'page' : undefined"
        @click="$emit('update:activeTab', 'settings')"
      >
        <Icon icon="mdi:cog-outline" :width="20" />
        <span class="sidebar-nav__item-label">设置</span>
        <span
          v-if="showAlert"
          class="sidebar-nav__alert"
          :class="{
            'sidebar-nav__alert--red': directoryAlert === 'unbound',
            'sidebar-nav__alert--yellow': directoryAlert === 'unauthorized',
          }"
          :title="
            directoryAlert === 'unbound'
              ? '可绑定本地目录使用，数据将以文件形式备份'
              : '本地目录权限丢失，需重新授权'
          "
        >
          <Icon icon="mdi:exclamation-thick" :width="11" />
          {{ directoryAlert === 'unbound' ? '未绑定' : '未授权' }}
        </span>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useSettingsStore } from '@/stores/settingsStore'

const props = defineProps<{
  activeTab: 'resumes' | 'templates' | 'ai' | 'trash' | 'settings'
  /** 是否为移动端抽屉模式（始终完整显示，不受 mobile 媒体查询隐藏） */
  mobile?: boolean
}>()

defineEmits<{
  'update:activeTab': [value: 'resumes' | 'templates' | 'ai' | 'trash' | 'settings']
}>()

const settingsStore = useSettingsStore()

// 'unbound'（未绑定，红）| 'unauthorized'（已绑定但权限丢失，黄）| null
const directoryAlert = computed<'unbound' | 'unauthorized' | null>(() => {
  if (!settingsStore.isSupported) return null // 浏览器不支持，不提示
  if (!settingsStore.directoryHandle) return 'unbound' // 未绑定
  if (settingsStore.permissionStatus !== 'granted') return 'unauthorized' // 已绑定但权限丢失
  return null
})

// 用户进入设置 tab 即视为已知晓，本会话内不再打扰；
// 刷新/重开页面（新会话）会重新提醒。状态解决后重置，允许下次新告警再提示。
const dismissed = ref(false)

watch(
  () => props.activeTab,
  (tab) => {
    if (tab === 'settings' && directoryAlert.value) {
      dismissed.value = true
    }
  },
)

watch(directoryAlert, (alert, prev) => {
  if (prev && !alert) {
    dismissed.value = false
  }
})

const showAlert = computed(() => directoryAlert.value && !dismissed.value)
</script>

<style lang="scss" scoped>
.sidebar-nav {
  flex-shrink: 0;
  width: 240px;
  height: 100%;
  background: var(--sidebar-bg);
  border-right: 1px solid $border-glass;
  display: flex;
  flex-direction: column;
  padding: $spacing-lg $spacing-md;
  transition: width $transition-base;
  overflow: hidden;

  // 移动端抽屉模式：覆盖 mobile 媒体查询的 display:none
  &--mobile {
    width: 240px;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    flex: 1;
  }

  &__item {
    position: relative;
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;      // 11px 珍珠按钮风格
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    color: $text-secondary;
    background: transparent;
    border: none;
    width: 100%;
    font-family: $font-family;
    font-size: $font-size-md;
    white-space: nowrap;

    &:hover {
      background: var(--bg-glass-hover);
      color: $text-primary;
    }

    &--active {
      background: $primary-color;      // Action Blue
      color: $text-white;

      &:hover {
        background: $primary-light;
        color: $text-white;
      }
    }
  }

  &__item-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // 设置 tab 角标：未绑定目录（红）/ 权限丢失（黄），右上角 pill
  &__alert {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 1px;
    color: $text-white;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    box-shadow: 0 0 0 2px var(--sidebar-bg);
    z-index: 2;

    &--red {
      background: $error-color;
    }

    &--yellow {
      background: $warning-color;
    }
  }
}

// 响应式：平板缩至图标模式
@include tablet {
  .sidebar-nav {
    width: 64px;
    padding: $spacing-md $spacing-xs;
    align-items: center;

    &__item {
      justify-content: center;
      padding: $spacing-sm;
    }

    &__item-label {
      display: none;
    }
  }
}

// 移动端：桌面侧边栏隐藏（抽屉模式的由 DashboardView 通过 v-if 控制）
@include mobile {
  .sidebar-nav:not(.sidebar-nav--mobile) {
    display: none;
  }
}
</style>