<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :locale="zhCN">
    <n-message-provider>
      <router-view />
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
</style>
