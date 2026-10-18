<template>
  <NModal :show="true" preset="card" title="同步到 Vivi Resume 插件" style="width: min(520px, 92vw)" @update:show="v => { if (!v) emit('close') }">
    <div class="sync-content">
      <p>将当前简历的可见字段发送到浏览器插件，供招聘网页填表使用。隐藏字段、模板和历史 AI 结果不会发送。</p>
      <p class="sync-hint">点击同步后，会自动连接当前浏览器中安装的 Vivi Resume 插件。</p>
      <NCheckbox v-model:checked="includeAiKey" :disabled="!aiStore.activeConfig">
        同时发送当前 AI 配置和 API Key
      </NCheckbox>
      <p class="sync-hint">勾选后才能使用插件的“AI 辅助对应”；若无法勾选，请先在 Vivi Resume 配置并启用 AI。资料与密钥只保存在插件的浏览器会话中，重启浏览器后需重新同步。</p>
      <div class="sync-actions">
        <NButton @click="emit('close')">取消</NButton>
        <NButton type="primary" :loading="sending" :disabled="!resumeStore.currentResume" @click="send">同步到插件</NButton>
      </div>
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NCheckbox, NButton } from 'naive-ui'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { buildExtensionProfile, buildExtensionAiConfig } from '@/services/extensionProfile'
import { message } from '@/plugins/naive-ui'

const emit = defineEmits<{ close: [] }>()
const resumeStore = useResumeStore()
const aiStore = useAIConfigStore()
const includeAiKey = ref(false)
const sending = ref(false)

type ChromeRuntime = {
  sendMessage: (id: string, payload: unknown, callback: (response?: { ok: boolean; error?: string; count?: number }) => void) => void
  lastError?: { message: string }
}

function discoverExtensionId(): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID()
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin
        || event.data?.type !== 'VIVI_EXTENSION_ID_RESPONSE_V1'
        || event.data.requestId !== requestId) return
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      const id = event.data.extensionId
      if (/^[a-p]{32}$/.test(id)) resolve(id)
      else reject(new Error('插件返回了无效的 ID，请重新加载插件'))
    }
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('未检测到插件，请确认已在当前浏览器安装并启用，然后刷新本页面'))
    }, 3000)
    window.addEventListener('message', onMessage)
    window.postMessage({ type: 'VIVI_EXTENSION_ID_REQUEST_V1', requestId }, location.origin)
  })
}

async function send() {
  const resume = resumeStore.currentResume
  if (!resume) return
  const runtime = (window as Window & { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime
  if (!runtime?.sendMessage) { message.error('当前浏览器无法连接插件，请确认扩展已安装并启用'); return }
  sending.value = true
  try {
    const config = includeAiKey.value ? aiStore.activeConfig : null
    const payload = {
      type: 'VIVI_SYNC_V1',
      profile: buildExtensionProfile(resume),
      ai: config ? buildExtensionAiConfig(config) : null,
    }
    const id = await discoverExtensionId()
    const result = await new Promise<{ ok: boolean; error?: string; count?: number }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('连接超时，请确认插件已安装并刷新页面')), 15000)
      runtime.sendMessage(id, payload, response => {
        clearTimeout(timer)
        if (runtime.lastError) reject(new Error(runtime.lastError.message))
        else if (response) resolve(response)
        else reject(new Error('插件没有响应'))
      })
    })
    if (!result.ok) throw new Error(result.error || '同步失败')
    message.success(`已同步 ${result.count} 项资料；打开招聘页面点击插件即可扫描`)
    emit('close')
  } catch (error) {
    message.error(`同步失败：${(error as Error).message}`)
  } finally { sending.value = false }
}
</script>

<style scoped>
.sync-content { display: grid; gap: 12px; }
.sync-content p { margin: 0; line-height: 1.6; }
.sync-content label { font-weight: 600; }
.sync-hint { color: var(--text-secondary); font-size: 12px; }
.sync-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
</style>
