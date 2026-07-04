<template>
  <div class="settings-panel">
    <!-- 头部 -->
    <div class="panel__header">
      <h2 class="panel__title">
        <Icon icon="mdi:cog-outline" :width="24" />
        设置
      </h2>
    </div>

    <!-- 本地目录绑定 -->
    <div class="settings-section">
      <h3 class="settings-section__title">
        <Icon icon="mdi:folder-outline" :width="20" />
        本地目录绑定
      </h3>
      <p class="settings-section__desc">
        绑定本地目录后，简历数据将以 JSON 文件形式存储在指定文件夹中，方便备份和版本管理。
        未绑定时，数据默认存储在浏览器 IndexedDB 中。
      </p>

      <!-- 浏览器不支持 -->
      <div v-if="!settingsStore.isSupported" class="settings-section__unsupported">
        <Icon icon="mdi:alert-circle-outline" :width="16" />
        <span>当前浏览器不支持本地目录功能，请使用 Chrome 或 Edge 浏览器</span>
      </div>

      <!-- 未绑定 -->
      <div v-else-if="!settingsStore.directoryHandle" class="settings-section__unbound">
        <button
          class="action-btn action-btn--primary"
          :disabled="settingsStore.isSyncing"
          @click="handleBind"
        >
          <Icon icon="mdi:folder-plus-outline" :width="18" />
          绑定目录
        </button>
        <p class="settings-section__hint">
          点击后选择一个本地文件夹，数据将自动从浏览器同步到该目录
        </p>
      </div>

      <!-- 已绑定 + 权限正常 -->
      <div v-else-if="settingsStore.permissionStatus === 'granted'" class="settings-section__bound">
        <div class="settings-section__dir-info">
          <Icon icon="mdi:folder-open-outline" :width="20" />
          <span class="settings-section__dir-name">{{ settingsStore.directoryName }}</span>
          <span class="settings-section__badge">已同步</span>
        </div>
        <div class="settings-section__actions">
          <button
            class="action-btn action-btn--primary"
            :disabled="settingsStore.isSyncing"
            @click="handleResync"
          >
            <Icon icon="mdi:sync" :width="18" />
            重新同步
          </button>
          <button
            class="action-btn action-btn--danger"
            :disabled="settingsStore.isSyncing"
            @click="openUnbindConfirm"
          >
            <Icon icon="mdi:folder-remove-outline" :width="18" />
            解绑目录
          </button>
        </div>
        <p class="settings-section__hint">
          点击「重新同步」将目录中的最新数据读取到应用中；解绑后数据将恢复到浏览器 IndexedDB 存储
        </p>
      </div>

      <!-- 已绑定 + 权限丢失 -->
      <div v-else class="settings-section__expired">
        <div class="settings-section__dir-info settings-section__dir-info--expired">
          <Icon icon="mdi:folder-off-outline" :width="20" />
          <span class="settings-section__dir-name">{{ settingsStore.directoryName }}</span>
          <span class="settings-section__badge settings-section__badge--warn">权限丢失</span>
        </div>
        <button
          class="action-btn action-btn--primary"
          :disabled="settingsStore.isSyncing"
          @click="handleReauthorize"
        >
          <Icon icon="mdi:lock-open-outline" :width="18" />
          重新授权
        </button>
        <p class="settings-section__hint settings-section__hint--warn">
          浏览器权限已过期，需要重新授权才能访问目录中的数据
        </p>
      </div>
    </div>

    <!-- 回收站设置 -->
    <div class="settings-section">
      <h3 class="settings-section__title">
        <Icon icon="mdi:delete-clock-outline" :width="20" />
        回收站设置
      </h3>
      <p class="settings-section__desc">
        删除的简历会移到回收站，在设定天数后自动清理。
      </p>
      <div class="settings-section__row">
        <span class="settings-section__label">保留天数</span>
        <NSelect
          v-model:value="retentionDays"
          :options="retentionOptions"
          size="small"
          style="width: 100px"
        />
      </div>
    </div>

    <!-- 回收箱设置 -->
    <div class="settings-section">
      <h3 class="settings-section__title">
        <Icon icon="mdi:delete-restore" :width="20" />
        回收箱设置
      </h3>
      <p class="settings-section__desc">
        编辑时删除的模块和卡片会暂存在回收箱，在设定天数后自动清理。
      </p>
      <div class="settings-section__row">
        <span class="settings-section__label">保留天数</span>
        <NSelect
          v-model:value="trashBinDays"
          :options="retentionOptions"
          size="small"
          style="width: 100px"
        />
      </div>
    </div>

    <!-- 解绑确认弹窗 -->
    <n-modal
      :show="showUnbindConfirm"
      preset="dialog"
      title="确认解绑目录"
      :auto-focus="false"
      :content="`解绑后目录「${settingsStore.directoryName}」中的文件默认保留，应用将切换回浏览器存储。`"
      @update:show="v => { if (!v) showUnbindConfirm = false }"
    >
      <div class="unbind-copy-option">
        <NCheckbox v-model:checked="copyToBrowser">
          同时将目录数据复制到浏览器存储
        </NCheckbox>
      </div>
      <template #action>
        <div class="unbind-actions">
          <button class="action-btn action-btn--primary" @click="handleUnbind">
            <Icon icon="mdi:folder-remove-outline" :width="16" />
            确认解绑
          </button>
          <button class="action-btn action-btn--ghost" @click="showUnbindConfirm = false">
            取消
          </button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NSelect, NCheckbox } from 'naive-ui'
import { useSettingsStore } from '@/stores/settingsStore'
import { useResumeStore } from '@/stores/resumeStore'

const settingsStore = useSettingsStore()
const resumeStore = useResumeStore()
const showUnbindConfirm = ref(false)
const copyToBrowser = ref(false)

// 回收站保留天数选项
const retentionOptions = [
  { label: '7 天', value: 7 },
  { label: '15 天', value: 15 },
  { label: '30 天', value: 30 },
]

const retentionDays = computed({
  get: () => resumeStore.trashRetentionDays,
  set: (val: number) => resumeStore.updateTrashRetentionDays(val),
})

const trashBinDays = computed({
  get: () => resumeStore.trashBinRetentionDays,
  set: (val: number) => resumeStore.updateTrashBinRetentionDays(val),
})

const handleBind = () => {
  settingsStore.bindDirectory()
}

const openUnbindConfirm = () => {
  copyToBrowser.value = false
  showUnbindConfirm.value = true
}

const handleUnbind = () => {
  showUnbindConfirm.value = false
  settingsStore.unbindDirectory(copyToBrowser.value)
}

const handleReauthorize = () => {
  settingsStore.reauthorize()
}

const handleResync = () => {
  settingsStore.resyncDirectory()
}
</script>

<style lang="scss" scoped>
.settings-panel {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
}

// 面板头部（复用 AISettingsPanel 样式）
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
}

// 设置分区
.settings-section {
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  padding: $spacing-lg;

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 $spacing-md;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.6;
    margin: 0 0 $spacing-lg;
  }

  &__unsupported {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-md;
    background: rgba($warning-color, 0.1);
    border: 1px solid rgba($warning-color, 0.2);
    border-radius: $radius-md;
    color: $warning-color;
    font-size: $font-size-sm;
  }

  &__unbound,
  &__bound,
  &__expired {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }

  &__dir-info {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-md;
    background: rgba($success-color, 0.08);
    border: 1px solid rgba($success-color, 0.15);
    border-radius: $radius-md;

    &--expired {
      background: rgba($warning-color, 0.08);
      border-color: rgba($warning-color, 0.15);
    }
  }

  &__dir-name {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    flex: 1;
  }

  &__badge {
    font-size: $font-size-xs;
    padding: 2px 8px;
    border-radius: $radius-sm;
    background: rgba($success-color, 0.15);
    color: $success-color;
    font-weight: 500;

    &--warn {
      background: rgba($warning-color, 0.15);
      color: $warning-color;
    }
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }

  &__hint {
    font-size: $font-size-xs;
    color: $text-light;
    line-height: 1.5;

    &--warn {
      color: $warning-color;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__label {
    font-size: $font-size-sm;
    color: $text-secondary;
  }
}

// 解绑弹窗操作区
.unbind-actions {
  display: flex;
  justify-content: center;
  width: 100%;
  gap: $spacing-sm;
  margin-top: $spacing-md;
}

.unbind-copy-option {
  margin: $spacing-md 0 0;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-glass-hover);
  border: 1px solid var(--border-glass);
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: var(--text-primary);
}

// 通用操作按钮（复用 AISettingsPanel 样式）
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: 1px solid transparent;
  font-family: $font-family;

  &--primary {
    background: $primary-color;
    color: #fff;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

    &:hover {
      background: $primary-light;
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }

  &--danger {
    background: rgba($error-color, 0.12);
    color: $error-color;
    border-color: rgba($error-color, 0.25);

    &:hover {
      background: rgba($error-color, 0.22);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--ghost {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
    border-color: var(--border-glass);

    &:hover {
      background: var(--bg-glass-active);
      border-color: var(--border-hover);
    }
  }
}
</style>
