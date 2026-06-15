<template>
  <div class="ai-settings-panel">
    <!-- 头部 -->
    <div class="panel__header">
      <h2 class="panel__title">
        <Icon icon="mdi:robot-outline" :width="24" />
        AI 服务
      </h2>
      <button class="action-btn action-btn--primary" @click="openAddModal">
        <Icon icon="mdi:plus" :width="18" />
        添加 AI 服务
      </button>
    </div>

    <!-- Token 用量（置顶高亮） -->
    <div v-if="aiConfigStore.totalTokens.total > 0" class="panel__usage">
      <div class="panel__usage-icon">
        <Icon icon="mdi:chart-bar" :width="20" />
      </div>
      <div class="panel__usage-body">
        <div class="panel__usage-total">
          {{ aiConfigStore.totalTokens.total.toLocaleString() }}
          <span class="panel__usage-unit">tokens</span>
        </div>
        <div class="panel__usage-detail">
          <span>输入 <strong>{{ aiConfigStore.totalTokens.prompt.toLocaleString() }}</strong></span>
          <span class="panel__usage-sep">·</span>
          <span>输出 <strong>{{ aiConfigStore.totalTokens.completion.toLocaleString() }}</strong></span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!aiConfigStore.hasConfigs" class="panel__empty">
      <Icon icon="mdi:robot-confused-outline" :width="64" />
      <p class="panel__empty-title">还没有配置 AI 服务</p>
      <p class="panel__empty-hint">配置后可在编辑器中使用 AI 润色、简化、扩展、总结等功能</p>
      <button class="action-btn action-btn--primary" @click="openAddModal">
        <Icon icon="mdi:plus" :width="18" />
        添加 AI 服务
      </button>
    </div>

    <!-- 配置列表 -->
    <div v-else class="panel__list">
      <AIConfigCard
        v-for="config in aiConfigStore.configs"
        :key="config.id"
        :config="config"
        :is-active="config.id === aiConfigStore.activeConfigId"
        @edit="openEditModal(config)"
        @copy="handleCopy(config.id)"
        @delete="handleDelete(config.id)"
        @set-active="aiConfigStore.setActiveConfig(config.id)"
        @deactivate="handleDeactivate"
      />
    </div>

    <!-- 添加/编辑弹窗 -->
    <AIConfigModal
      :visible="showModal"
      :config="editingConfig"
      @close="closeModal"
      @save="handleSave"
    />

    <!-- 安全提示 -->
    <div class="panel__security-notice">
      <Icon icon="mdi:information-outline" :width="14" />
      <span>API Key 存储于本地浏览器或本地目录，未加密。请勿在不信任的设备上保存密钥。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { message as naiveMessage } from '@/plugins/naive-ui'
import type { AIServiceConfig } from '@/types/aiConfig'
import AIConfigCard from '@/components/ai/AIConfigCard.vue'
import AIConfigModal from '@/components/ai/AIConfigModal.vue'

const aiConfigStore = useAIConfigStore()

const showModal = ref(false)
const editingConfig = ref<AIServiceConfig | null>(null)

const openAddModal = () => {
  editingConfig.value = null
  showModal.value = true
}

const openEditModal = (config: AIServiceConfig) => {
  editingConfig.value = config
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingConfig.value = null
}

const handleSave = async (data: Omit<AIServiceConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    if (editingConfig.value) {
      await aiConfigStore.updateConfig(editingConfig.value.id, data)
      naiveMessage.success('配置已更新')
    } else {
      await aiConfigStore.addConfig(data)
      naiveMessage.success('配置已添加')
    }
    closeModal()
  } catch (e) {
    console.error('[AISettingsPanel] 保存失败:', e)
    naiveMessage.error('保存失败，请重试')
  }
}

const handleCopy = async (id: string) => {
  try {
    const duplicated = await aiConfigStore.duplicateConfig(id)
    if (duplicated) {
      naiveMessage.info('配置已复制，请输入 API Key')
      openEditModal(duplicated)
    }
  } catch (e) {
    console.error('[AISettingsPanel] 复制失败:', e)
    naiveMessage.error('复制失败，请重试')
  }
}

const handleDelete = async (id: string) => {
  try {
    await aiConfigStore.deleteConfig(id)
    naiveMessage.success('配置已删除')
  } catch (e) {
    console.error('[AISettingsPanel] 删除失败:', e)
    naiveMessage.error('删除失败，请重试')
  }
}

const handleDeactivate = async () => {
  try {
    await aiConfigStore.setActiveConfig(null)
    naiveMessage.success('已停用当前 AI 服务')
  } catch (e) {
    console.error('[AISettingsPanel] 停用失败:', e)
    naiveMessage.error('停用失败，请重试')
  }
}
</script>

<style lang="scss" scoped>
.ai-settings-panel {
  //
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-xl;
}

.panel__title {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-xl;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
  @include gradient-text;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  border: none;
  border-radius: $radius-lg;
  cursor: pointer;
  font-size: $font-size-sm;
  font-weight: 500;
  font-family: $font-family;
  transition: all $transition-base;
  white-space: nowrap;

  &--primary {
    @include button-primary;
  }
}

.panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-3xl 0;
  color: $text-light;
  text-align: center;
  gap: $spacing-md;

  &-title {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-secondary;
    margin: 0;
  }

  &-hint {
    font-size: $font-size-sm;
    margin: 0;
    max-width: 320px;
  }
}

.panel__list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.panel__security-notice {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: $spacing-lg;
  font-size: $font-size-xs;
  color: $text-light;
}

.panel__usage {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
  padding: $spacing-md $spacing-lg;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
}

.panel__usage-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: $radius-md;
  background: rgba($primary-color, 0.1);
  color: $primary-color;
  flex-shrink: 0;
}

.panel__usage-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel__usage-total {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $text-primary;
  line-height: 1.2;
}

.panel__usage-unit {
  font-size: $font-size-xs;
  font-weight: 500;
  color: $primary-light;
  margin-left: 4px;
}

.panel__usage-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: $font-size-xs;
  color: $text-secondary;

  strong {
    color: $text-primary;
    font-weight: 600;
  }
}

.panel__usage-sep {
  color: $text-light;
}
</style>
