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
                  <template v-if="isDev && devProxyEndpoint">
                    开发环境对官方 API 已自动使用代理地址，无需额外配置
                  </template>
                  <template v-else>
                    该服务商官方 API 不支持浏览器直调，你可能需要配置代理
                  </template>
                </template>
                <template v-else>
                  此服务商官方 API 支持浏览器直接调用
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
                API Key 将以明文存储在本地浏览器或设置的本地目录中，请勿在公共设备上保存密钥
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
        </template>
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="$emit('close')">取消</n-button>
        <n-button type="primary" @click="handleSave">
          {{ isEdit ? '保存修改' : '添加' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NForm, NFormItem, NInput, NSelect, NButton, NPopover, type FormInst, type FormRules } from 'naive-ui'
import type { AIServiceConfig, AIProvider } from '@/types/aiConfig'
import { AI_PROVIDERS, getProviderInfo } from '@/types/aiConfig'
import { getDevProxyEndpoint } from '@/services/aiService'

const props = defineProps<{
  visible: boolean
  config?: AIServiceConfig | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: Omit<AIServiceConfig, 'id' | 'createdAt' | 'updatedAt'>]
}>()

const isDev = import.meta.env.DEV
const isEdit = computed(() => !!props.config)

const formRef = ref<FormInst | null>(null)

const formData = ref({
  name: '',
  provider: 'deepseek' as AIProvider,
  modelId: '',
  apiKey: '',
  endpoint: '',
})

const providerOptions = AI_PROVIDERS.map(p => ({
  label: p.name,
  value: p.id,
}))

const selectedProvider = computed(() => getProviderInfo(formData.value.provider))

const devProxyEndpoint = computed(() => {
  if (!isDev || !selectedProvider.value) return ''
  return getDevProxyEndpoint(formData.value.provider, selectedProvider.value.defaultEndpoint)
})

// 共用校验逻辑：返回错误消息字符串，无错误返回空串
function validateEndpoint(value: string): string {
  if (!value) return ''
  // 开发环境下允许 /api/ 开头的代理路径
  if (isDev && value.startsWith('/api/')) return ''
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') {
      return 'API 地址必须以 https:// 开头'
    }
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
      }
    } else {
      // 新增模式：使用 DeepSeek 作为默认
      const defaultProvider = AI_PROVIDERS.find(p => p.id === 'deepseek')!
      formData.value = {
        name: '',
        provider: defaultProvider.id,
        modelId: defaultProvider.defaultModel,
        apiKey: '',
        endpoint: defaultProvider.defaultEndpoint,
      }
    }
  }
})

const onProviderChange = (providerId: AIProvider) => {
  const info = getProviderInfo(providerId)
  if (info) {
    formData.value.modelId = info.defaultModel
    // 开发环境下自动使用代理地址
    formData.value.endpoint = isDev
      ? getDevProxyEndpoint(providerId, info.defaultEndpoint)
      : info.defaultEndpoint
  }
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  emit('save', { ...formData.value })
}
</script>

<style lang="scss" scoped>
.modal-footer {
  display: flex;
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
}

.endpoint-error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: $font-size-xs;
  color: $error-color;
}
</style>
