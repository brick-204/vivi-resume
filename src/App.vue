<template>
  <n-config-provider :theme="naiveDarkTheme" :theme-overrides="themeOverrides" :locale="zhCN">
    <n-message-provider>
      <router-view />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { zhCN } from 'naive-ui'
import { naiveDarkTheme, themeOverrides } from '@/plugins/naive-ui'
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
}
</style>