<template>
  <a href="#main-content" class="skip-to-content">跳到主要内容</a>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :locale="zhCN">
    <n-message-provider>
      <router-view />
      <div id="aria-live-status" aria-live="polite" aria-atomic="true" class="sr-only"></div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { zhCN } from 'naive-ui'
import { getNaiveTheme, getNaiveThemeOverrides } from '@/plugins/naive-ui'
import { useTheme } from '@/composables/useTheme'

const { resolvedTheme } = useTheme()

const naiveTheme = computed(() => getNaiveTheme(resolvedTheme.value))
const naiveThemeOverrides = computed(() => getNaiveThemeOverrides(resolvedTheme.value))
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
}

.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #4f6df5;
  color: white;
  z-index: 9999;
  transition: top 0.2s;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 8px 0;
  font-size: 14px;
}

.skip-to-content:focus {
  top: 0;
}
</style>
