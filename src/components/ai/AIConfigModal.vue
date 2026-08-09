<template>
  <n-modal
    :show="visible"
    preset="card"
    :title="isEdit ? '编辑 AI 服务' : '添加 AI 服务'"
    :style="{ maxWidth: '520px' }"
    :mask-closable="true"
    @update:show="v => { if (!v) $emit('close') }"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="100"
    >
      <n-form-item label="配置名称" path="name">
        <n-input v-model:value="formData.name" placeholder="如：我的 DeepSeek" />
      </n-form-item>

      <n-form-item path="provider">
        <template #label>
          <span class="label-with-hint">
            服务商
            <n-popover trigger="hover" placement="top" :width="240">
              <template #trigger>
                <span class="hint-icon" :class="{ 'hint-icon--warning': !selectedProvider?.corsFriendly }">
                  <Icon icon="mdi:alert-circle-outline" :width="14" />
                </span>
              </template>
              <div class="hint-content">
                <template v-if="!selectedProvider?.corsFriendly">
                  <template v-if="useWebDevProxy && devProxyEndpoint">
                    开发环境对官方 API 已自动使用代理地址，无需额外配置
                  </template>
                  <template v-else>
                    该服务商官方 API 不支持直接调用，你可能需要配置代理
                  </template>
                </template>
                <template v-else>
                  此服务商官方 API 支持直接调用，无需代理
                </template>
              </div>
            </n-popover>
          </span>
        </template>
        <n-select
          v-model:value="formData.provider"
          :options="providerOptions"
          @update:value="onProviderChange"
        />
      </n-form-item>

      <n-form-item label="模型 ID" path="modelId">
        <n-input v-model:value="formData.modelId" placeholder="如：gpt-4o-mini、deepseek-chat" />
      </n-form-item>

      <n-form-item path="apiKey">
        <template #label>
          <span class="label-with-hint">
            API Key
            <n-popover trigger="hover" placement="top" :width="260">
              <template #trigger>
                <span class="hint-icon hint-icon--warning">
                  <Icon icon="mdi:alert-circle-outline" :width="14" />
                </span>
              </template>
              <div class="hint-content">
                API Key 将以明文存储在本机（应用内置存储或设置的本地目录）中，请勿在公共设备上保存密钥
              </div>
            </n-popover>
          </span>
        </template>
        <n-input
          v-model:value="formData.apiKey"
          type="password"
          show-password-on="click"
          placeholder="sk-..."
        />
      </n-form-item>

      <n-form-item label="API 地址" path="endpoint">
        <n-input v-model:value="formData.endpoint" placeholder="https://api.example.com/v1" />
        <template #feedback>
          <div v-if="endpointError" class="endpoint-error">
            <Icon icon="mdi:alert-circle-outline" :width="14" />
            {{ endpointError }}
          </div>
          <div class="endpoint-switch">
            <n-switch v-model:value="formData.endpointComplete" size="small" />
            <span class="endpoint-switch__label">完整 URL</span>
            <n-popover trigger="hover" placement="top" :width="260">
              <template #trigger>
                <span class="hint-icon hint-icon--warning endpoint-switch__hint-icon">
                  <Icon icon="mdi:alert-circle-outline" :width="14" />
                </span>
              </template>
              <div class="hint-content">
                <p v-if="formData.endpointComplete">
                  <strong>开</strong>：完全信任输入的地址，系统不做任何补全。需填完整请求 URL，如 <code>https://api.example.com/v1/chat/completions</code>
                </p>
                <p v-else>
                  <strong>关（默认）</strong>：系统自动补全 /v1（或 /v4 智谱）+ /chat/completions。只需填到域名或基础路径，如 <code>https://api.deepseek.com</code>
                </p>
              </div>
            </n-popover>
            <template v-if="isElectron">
              <span class="endpoint-switch__divider" />
              <n-switch v-model:value="formData.useProxy" size="small" />
              <span class="endpoint-switch__label">代理转发</span>
              <n-popover trigger="hover" placement="top" :width="280">
                <template #trigger>
                  <span class="hint-icon endpoint-switch__hint-icon">
                    <Icon icon="mdi:information-outline" :width="14" />
                  </span>
                </template>
                <div class="hint-content">
                  <p>
                    <strong>开</strong>：通过应用内置的本地代理转发请求，可解决中转站不支持 CORS（浏览器跨域拦截）的问题。仅支持 <strong>HTTPS 公网地址</strong>。
                  </p>
                  <p>
                    <strong>关（默认）</strong>：浏览器直连你填的地址，中转站需自行配置 CORS 放行。
                  </p>
                </div>
              </n-popover>
            </template>
          </div>
        </template>
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-footer">
        <n-button :disabled="saving" @click="$emit('close')">取消</n-button>
        <n-button type="primary" :loading="saving" :disabled="saving" @click="handleSave">
          {{ isEdit ? '保存修改' : '添加' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NForm, NFormItem, NInput, NSelect, NButton, NPopover, NSwitch, type FormInst, type FormRules } from 'naive-ui'
import type { AIServiceConfig, AIProvider } from '@/types/aiConfig'
import { AI_PROVIDERS, getProviderInfo } from '@/types/aiConfig'
import { getDevProxyEndpoint } from '@/services/aiService'
import { isElectron } from '@/utils/runtime'

const props = defineProps<{
  visible: boolean
  config?: AIServiceConfig | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: Omit<AIServiceConfig, 'id' | 'createdAt' | 'updatedAt'>]
}>()

const isDev = import.meta.env.MODE === 'development'
// web dev 走 Vite sseProxy（固定 provider 路由），桌面端走主进程动态代理（endpoint 填真实地址，代理改写在 aiService）。
// 仅 web dev 需要把 endpoint 填成 Vite 代理路径并展示代理 endpoint 提示。
const useWebDevProxy = isDev && !isElectron
const isEdit = computed(() => !!props.config)
// ponytail: 保存按钮 spin，覆盖表单校验期间，防连点；emit 后父立即关弹窗销毁本组件
const saving = ref(false)

const formRef = ref<FormInst | null>(null)

const formData = ref({
  name: '',
  provider: 'deepseek' as AIProvider,
  modelId: '',
  apiKey: '',
  endpoint: '',
  endpointComplete: false,
  useProxy: false,
})

const providerOptions = AI_PROVIDERS.map(p => ({
  label: p.name,
  value: p.id,
}))

const selectedProvider = computed(() => getProviderInfo(formData.value.provider))

const devProxyEndpoint = computed(() => {
  if (!useWebDevProxy || !selectedProvider.value) return ''
  return getDevProxyEndpoint(formData.value.provider, selectedProvider.value.defaultEndpoint)
})

// 共用校验逻辑：返回错误消息字符串，无错误返回空串
function validateEndpoint(value: string): string {
  if (!value) return ''
  // web dev 代理模式下允许 /api/ 开头的代理路径（Vite 相对路径）
  if (useWebDevProxy && value.startsWith('/api/')) return ''
  // 纯客户端请求，用户自管 API，仅做基本 URL 格式校验，不强制 https
  try {
    new URL(value)
    return ''
  } catch {
    return '请输入有效的 URL 格式'
  }
}

// 实时反馈的协议错误（输入时即显示，无需等失焦）
const endpointError = computed(() => validateEndpoint(formData.value.endpoint))

const rules: FormRules = {
  name: { required: true, message: '请输入配置名称', trigger: 'blur' },
  provider: { required: true, message: '请选择服务商', trigger: 'change' },
  modelId: { required: true, message: '请输入模型 ID', trigger: 'blur' },
  apiKey: { required: true, message: '请输入 API Key', trigger: 'blur' },
  endpoint: [
    { required: true, message: '请输入 API 地址', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string) => {
        const error = validateEndpoint(value)
        return error ? new Error(error) : true
      },
      trigger: 'blur',
    },
  ],
}

// 当弹窗打开时，填充编辑数据或默认值
watch(() => props.visible, (val) => {
  if (val) {
    if (props.config) {
      formData.value = {
        name: props.config.name,
        provider: props.config.provider,
        modelId: props.config.modelId,
        apiKey: props.config.apiKey,
        endpoint: props.config.endpoint,
        endpointComplete: props.config.endpointComplete ?? false,
        useProxy: props.config.useProxy ?? false,
      }
    } else {
      // 新增模式：使用 DeepSeek 作为默认
      const defaultProvider = AI_PROVIDERS.find(p => p.id === 'deepseek')!
      formData.value = {
        name: '',
        provider: defaultProvider.id,
        modelId: defaultProvider.defaultModel,
        apiKey: '',
        endpoint: useWebDevProxy
          ? getDevProxyEndpoint(defaultProvider.id, defaultProvider.defaultEndpoint)
          : defaultProvider.defaultEndpoint,
        endpointComplete: false,
        useProxy: false,
      }
    }
  }
})

const onProviderChange = (providerId: AIProvider) => {
  const info = getProviderInfo(providerId)
  if (info) {
    formData.value.modelId = info.defaultModel
    // web dev 填 Vite 代理路径；桌面端/生产 web 填服务商真实地址（桌面端代理改写在 aiService，按 useProxy 开关）
    formData.value.endpoint = useWebDevProxy
      ? getDevProxyEndpoint(providerId, info.defaultEndpoint)
      : info.defaultEndpoint
    // 切换服务商填的是需系统补全的基础路径，与「完整 URL」模式互斥
    formData.value.endpointComplete = false
  }
}

const handleSave = async () => {
  if (saving.value) return
  saving.value = true
  try {
    await formRef.value?.validate()
  } catch {
    saving.value = false
    return
  }
  emit('save', { ...formData.value })
  // ponytail: 父组件收到 save 后同步更新内存并 closeModal 销毁本组件；
  //           万一父未关弹窗（如 isLocked 静默失败），复位 saving 让用户可重试
  saving.value = false
}
</script>

<style lang="scss" scoped>
.modal-footer {
  display: flex;
  flex-direction: row-reverse;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
}

.label-with-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hint-icon {
  display: inline-flex;
  align-items: center;
  color: $success-color;
  cursor: help;
  vertical-align: middle;
  margin-top: -2px;

  &--warning {
    color: $warning-color;
  }
}

.hint-content {
  font-size: $font-size-xs;
  line-height: 1.5;

  p {
    margin: 0 0 $spacing-xs;

    &:last-child {
      margin-bottom: 0;
    }
  }

  code {
    padding: 1px 4px;
    background: $bg-glass;
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    word-break: break-all;
  }
}

.endpoint-error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: $font-size-xs;
  color: $error-color;
}

.endpoint-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: $font-size-xs;
  color: $text-secondary;

  &__label {
    font-weight: 500;
    color: $text-primary;
    white-space: nowrap;
  }

  &__divider {
    width: 1px;
    height: 14px;
    margin: 0 4px;
    background: $border-color;
  }
}
</style>
