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
            @click="showUnbindConfirm = true"
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

    <!-- 解绑确认弹窗 -->
    <n-modal
      :show="showUnbindConfirm"
      preset="dialog"
      title="确认解绑目录"
      :content="`解绑后，数据将恢复到浏览器存储。目录「${settingsStore.directoryName}」中的文件如何处理？`"
      @update:show="v => { if (!v) showUnbindConfirm = false }"
    >
      <template #action>
        <div class="unbind-actions">
          <button class="action-btn action-btn--danger" @click="handleUnbind(true)">
            <Icon icon="mdi:delete-outline" :width="16" />
            解绑并删除文件
          </button>
          <button class="action-btn action-btn--primary" @click="handleUnbind(false)">
            <Icon icon="mdi:folder-check-outline" :width="16" />
            解绑并保留文件
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
import { NModal, NSelect } from 'naive-ui'
import { useSettingsStore } from '@/stores/settingsStore'
import { useResumeStore } from '@/stores/resumeStore'

const settingsStore = useSettingsStore()
const resumeStore = useResumeStore()
const showUnbindConfirm = ref(false)

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

const handleBind = () => {
  settingsStore.bindDirectory()
}

const handleUnbind = (deleteFiles: boolean) => {
  showUnbindConfirm.value = false
  settingsStore.unbindDirectory(deleteFiles)
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
  gap: $spacing-sm;
  margin-top: $spacing-md;
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
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-base;
  border: 1px solid transparent;
  font-family: $font-family;

  &--primary {
    background: $primary-bg-active;
    color: $text-white;
    border: none;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }

  &--danger {
    background: rgba($error-color, 0.1);
    color: $error-color;
    border-color: rgba($error-color, 0.2);

    &:hover {
      background: rgba($error-color, 0.2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--ghost {
    background: transparent;
    color: $text-secondary;
    border-color: $border-glass;

    &:hover {
      background: $bg-glass;
      color: $text-primary;
    }
  }
}
</style>
