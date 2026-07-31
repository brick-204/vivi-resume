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

    <!-- 回收设置（回收站 + 回收箱） -->
    <div class="settings-section">
      <h3 class="settings-section__title">
        <Icon icon="mdi:delete-clock-outline" :width="20" />
        回收设置
      </h3>
      <p class="settings-section__desc">
        删除的内容会暂存并在设定天数后自动清理，期间可恢复。
      </p>

      <!-- 回收站（简历级） -->
      <div class="settings-subsection">
        <h4 class="settings-subsection__title">
          <Icon icon="mdi:delete-clock-outline" :width="18" />
          回收站
        </h4>
        <p class="settings-subsection__desc">
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

      <!-- 回收箱（模块/卡片级） -->
      <div class="settings-subsection">
        <h4 class="settings-subsection__title">
          <Icon icon="mdi:delete-restore" :width="18" />
          回收箱
        </h4>
        <p class="settings-subsection__desc">
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
    </div>

    <!-- 桌宠设置 -->
    <div class="settings-section">
      <h3 class="settings-section__title">
        <Icon icon="mdi:cat" :width="20" />
        桌宠设置
      </h3>
      <p class="settings-section__desc">
        选择陪伴你的桌宠形象，或上传 lottie.json 添加自定义桌宠。
      </p>
      <div class="pet-options">
        <button
          v-for="pet in allPets"
          :key="pet.id"
          type="button"
          class="pet-option"
          :class="{ 'is-active': settingsStore.currentPetId === pet.id }"
          @click="handlePetChange(pet.id)"
        >
          <PetPreview :pet-id="pet.id" />
          <span class="pet-option__name">{{ pet.name }}</span>
          <Icon
            v-if="settingsStore.currentPetId === pet.id"
            icon="mdi:check-circle"
            class="pet-option__check"
            :width="18"
          />
          <button
            v-if="isCustomPet(pet.id)"
            type="button"
            class="pet-option__rename"
            title="改名"
            @click.stop="openRenamePet(pet.id, pet.name)"
          >
            <Icon icon="mdi:pencil-outline" :width="14" />
          </button>
          <button
            v-if="isCustomPet(pet.id)"
            type="button"
            class="pet-option__delete"
            :title="removingPetId === pet.id ? '删除中…' : '删除'"
            :disabled="removingPetId === pet.id"
            @click.stop="handleRemovePet(pet.id)"
          >
            <Icon
              :icon="removingPetId === pet.id ? 'mdi:loading' : 'mdi:close'"
              :width="14"
              :class="{ 'is-spin': removingPetId === pet.id }"
            />
          </button>
        </button>
      </div>
      <button class="action-btn action-btn--ghost pet-add-btn" @click="openAddPetModal">
        <Icon icon="mdi:plus" :width="18" />
        添加自定义桌宠
      </button>

      <!-- 休息提醒（桌宠设置子分区） -->
      <div class="settings-subsection">
        <h4 class="settings-subsection__title">
          <Icon icon="mdi:eye-check-outline" :width="18" />
          休息提醒
        </h4>
        <p class="settings-subsection__desc">
          连续用眼达到设定时长后，桌宠会提醒你望 6 米外歇 20 秒（20-20-20 护眼法则）。仅在使用本页面时计时。
        </p>
        <div class="settings-section__row">
          <span class="settings-section__label">开启提醒</span>
          <NSwitch v-model:value="restEnabled" />
        </div>
        <div class="settings-section__row" :class="{ 'is-disabled': !restEnabled }">
          <span class="settings-section__label">提醒间隔</span>
          <NInputNumber
            v-model:value="restInterval"
            :min="10"
            :max="1000"
            :step="5"
            :disabled="!restEnabled"
            size="small"
            style="width: 140px"
          >
            <template #suffix>分钟</template>
          </NInputNumber>
        </div>
      </div>

      <!-- AI 动态话术（桌宠设置子分区） -->
      <div class="settings-subsection">
        <h4 class="settings-subsection__title">
          <Icon icon="mdi:robot-excited-outline" :width="18" />
          AI 动态话术
        </h4>
        <p class="settings-subsection__desc">
          开启后，桌宠在保存、导出、进入编辑器、被悬停、点击、拖拽等时刻会由 AI 现编一句话，更生动（需先配置 AI 服务商）。空闲自动冒泡和休息提醒仍用预设话术。<strong>注意：每次触发都会消耗 AI token，请根据你的用量酌情开启。</strong>
        </p>
        <div class="settings-section__row">
          <span class="settings-section__label">开启 AI 动态话术</span>
          <NSwitch v-model:value="petAIChatEnabled" />
        </div>
      </div>
    </div>

    <!-- 添加自定义桌宠弹窗 -->
    <n-modal
      :show="showAddPetModal"
      preset="card"
      title="添加自定义桌宠"
      style="max-width: 460px"
      :auto-focus="false"
      @update:show="v => { if (!v) showAddPetModal = false }"
    >
      <div class="add-pet-form">
        <div class="add-pet-form__field">
          <label class="add-pet-form__label">桌宠素材文件</label>
          <input
            type="file"
            accept=".json,application/json,.lottie,image/gif,image/apng,image/webp,image/png,image/svg+xml,image/avif"
            class="add-pet-form__file"
            @change="onPetFileChange"
          />
          <p class="add-pet-form__support">
            支持 Lottie JSON / .lottie / GIF·APNG·WebP·PNG·SVG
          </p>
          <p v-if="newPetFile" class="add-pet-form__hint">
            已选择：{{ newPetFile.name }}
          </p>
        </div>
        <div class="add-pet-form__field">
          <label class="add-pet-form__label">桌宠名字</label>
          <NInput v-model:value="newPetName" placeholder="给桌宠起个名字" />
        </div>
        <div class="add-pet-form__actions">
          <button
            class="action-btn action-btn--primary"
            :disabled="addingPet"
            @click="confirmAddPet"
          >
            <Icon
              :icon="addingPet ? 'mdi:loading' : 'mdi:check'"
              :width="16"
              :class="{ 'is-spin': addingPet }"
            />
            {{ addingPet ? '添加中…' : '确认添加' }}
          </button>
          <button class="action-btn action-btn--ghost" @click="showAddPetModal = false">
            取消
          </button>
        </div>
      </div>
    </n-modal>

    <!-- 删除桌宠确认弹窗 -->
    <n-modal
      :show="showRemovePetConfirm"
      preset="dialog"
      title="确认删除桌宠"
      :auto-focus="false"
      :content="'删除后「' + pendingRemovePetName + '」将移至回收站，可在回收站恢复。'"
      @update:show="v => { if (!v) showRemovePetConfirm = false }"
    >
      <template #action>
        <div class="unbind-actions">
          <button class="action-btn action-btn--primary" @click="confirmRemovePet">
            <Icon icon="mdi:trash-can-outline" :width="16" />
            移至回收站
          </button>
          <button class="action-btn action-btn--ghost" @click="showRemovePetConfirm = false">
            取消
          </button>
        </div>
      </template>
    </n-modal>

    <!-- 改名桌宠弹窗 -->
    <n-modal
      :show="showRenamePetModal"
      preset="card"
      title="给桌宠改名"
      style="max-width: 380px"
      :auto-focus="false"
      @update:show="v => { if (!v) showRenamePetModal = false }"
    >
      <div class="add-pet-form">
        <div class="add-pet-form__field">
          <label class="add-pet-form__label">桌宠名字</label>
          <NInput v-model:value="renamePetName" placeholder="输入新名字" @keydown.enter="confirmRenamePet" />
        </div>
        <div class="add-pet-form__actions">
          <button
            class="action-btn action-btn--primary"
            :disabled="renamingPet"
            @click="confirmRenamePet"
          >
            <Icon
              :icon="renamingPet ? 'mdi:loading' : 'mdi:check'"
              :width="16"
              :class="{ 'is-spin': renamingPet }"
            />
            {{ renamingPet ? '保存中…' : '保存' }}
          </button>
          <button class="action-btn action-btn--ghost" @click="showRenamePetModal = false">
            取消
          </button>
        </div>
      </div>
    </n-modal>

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
import { ref, computed, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NSelect, NCheckbox, NInput, NSwitch, NInputNumber } from 'naive-ui'
import { useSettingsStore } from '@/stores/settingsStore'
import { useResumeStore } from '@/stores/resumeStore'
import { DESKTOP_PETS } from '@/config/desktopPets'
import { parsePetFile, type ParsedPet } from '@/utils/petUpload'
import { message as naiveMessage } from '@/plugins/naive-ui'
import PetPreview from '@/components/ai/PetPreview.vue'

const settingsStore = useSettingsStore()
const resumeStore = useResumeStore()
// 内置 + 自定义 合并列表（响应式，customPets 由 store 提供）
const allPets = computed(() => [...DESKTOP_PETS, ...settingsStore.customPets])
const showUnbindConfirm = ref(false)
const copyToBrowser = ref(false)

const handlePetChange = (petId: string) => {
  settingsStore.updateDesktopPetId(petId)
}

// 休息提醒开关与间隔（setter 内同步 petStore + 持久化 + 开关说话反馈）
const restEnabled = computed({
  get: () => settingsStore.restReminderEnabled,
  set: (val: boolean) => { settingsStore.updateRestReminderEnabled(val) },
})
const restInterval = computed({
  get: () => settingsStore.restReminderInterval,
  set: (val: number | null) => {
    if (val == null) return
    settingsStore.updateRestReminderInterval(val)
  },
})

// 桌宠 AI 动态话术开关（setter 内注入 petStore + 持久化）
const petAIChatEnabled = computed({
  get: () => settingsStore.petAIChatEnabled,
  set: (val: boolean) => { settingsStore.updatePetAIChatEnabled(val) },
})

const isCustomPet = (id: string) => id.startsWith('custom-')

// 添加自定义桌宠 modal 状态
const showAddPetModal = ref(false)
const newPetName = ref('')
const newPetFile = ref<File | null>(null)
const newPetParsed = ref<ParsedPet | null>(null)
const addingPet = ref(false)

const openAddPetModal = () => {
  newPetName.value = ''
  newPetFile.value = null
  newPetParsed.value = null
  showAddPetModal.value = true
}

const onPetFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  newPetFile.value = file
  // 默认名字用文件名（去扩展名）
  if (!newPetName.value) {
    newPetName.value = file.name.replace(/\.(json|lottie|gif|apng|webp|png|svg|avif)$/i, '')
  }
  try {
    newPetParsed.value = await parsePetFile(file)
  } catch (err) {
    naiveMessage.error((err as Error).message || '文件解析失败')
    newPetParsed.value = null
  }
}

const confirmAddPet = async () => {
  if (!newPetParsed.value) {
    naiveMessage.warning('请选择有效的桌宠素材文件')
    return
  }
  if (!newPetName.value.trim()) {
    naiveMessage.warning('请输入桌宠名字')
    return
  }
  addingPet.value = true
  // ponytail: 让出一帧让浏览器先画 spin，避免 await 阻塞主线程期间 INP 飙高（持久化+列表重渲染）
  await nextTick()
  try {
    const id = await settingsStore.addCustomPet(newPetName.value.trim(), newPetParsed.value)
    await settingsStore.updateDesktopPetId(id)
    naiveMessage.success('已添加自定义桌宠')
    showAddPetModal.value = false
    newPetName.value = ''
    newPetFile.value = null
    newPetParsed.value = null
  } catch (err) {
    console.error('[SettingsPanel] 添加自定义桌宠失败:', err)
    naiveMessage.error('添加失败，请重试')
  } finally {
    addingPet.value = false
  }
}

const handleRemovePet = (id: string) => {
  const pet = allPets.value.find(p => p.id === id)
  const name = pet?.name || '该桌宠'
  showRemovePetConfirm.value = true
  pendingRemovePetId.value = id
  pendingRemovePetName.value = name
}

const confirmRemovePet = async () => {
  const id = pendingRemovePetId.value
  showRemovePetConfirm.value = false
  pendingRemovePetId.value = ''
  if (!id) return
  removingPetId.value = id
  // ponytail: 让出一帧先画 spin，再执行持久化+列表重渲染
  await nextTick()
  try {
    await settingsStore.removeCustomPet(id)
    naiveMessage.success('已移至回收站，可随时恢复')
  } catch (err) {
    console.error('[SettingsPanel] 删除自定义桌宠失败:', err)
    naiveMessage.error('删除失败')
  } finally {
    removingPetId.value = null
  }
}

// 删除确认状态
const showRemovePetConfirm = ref(false)
const pendingRemovePetId = ref('')
const pendingRemovePetName = ref('')
// 正在删除的桌宠 id（按钮 spin 反馈）
const removingPetId = ref<string | null>(null)

// 改名 modal 状态
const showRenamePetModal = ref(false)
const renamePetId = ref('')
const renamePetName = ref('')
const renamingPet = ref(false)

const openRenamePet = (id: string, name: string) => {
  renamePetId.value = id
  renamePetName.value = name
  showRenamePetModal.value = true
}

const confirmRenamePet = async () => {
  const id = renamePetId.value
  const name = renamePetName.value.trim()
  if (!name) {
    naiveMessage.warning('请输入桌宠名字')
    return
  }
  renamingPet.value = true
  await nextTick()
  try {
    await settingsStore.renameCustomPet(id, name)
    showRenamePetModal.value = false
    naiveMessage.success('已改名')
  } catch (err) {
    console.error('[SettingsPanel] 改名失败:', err)
    naiveMessage.error('改名失败，请重试')
  } finally {
    renamingPet.value = false
  }
}

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

    // 相邻 row 之间拉开间距（如休息提醒的"开启提醒"与"提醒间隔"）
    & + & {
      margin-top: $spacing-md;
    }

    &.is-disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  &__label {
    font-size: $font-size-sm;
    color: $text-secondary;
  }
}

// 桌宠设置内的子分区（休息提醒 / AI 动态话术）
.settings-subsection {
  margin-top: $spacing-lg;
  padding-top: $spacing-lg;
  border-top: 1px solid $border-glass;

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 $spacing-sm;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.6;
    margin: 0 0 $spacing-md;
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

// 桌宠选项卡片
.pet-options {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-md;
}

.pet-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-md $spacing-lg;
  background: var(--bg-glass-hover);
  border: 2px solid var(--border-glass);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-base;
  font-family: $font-family;

  &:hover {
    border-color: var(--border-hover);
    transform: translateY(-2px);
  }

  &.is-active {
    border-color: $primary-color;
    background: rgba($primary-color, 0.08);
  }

  &__name {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
  }

  &__check {
    position: absolute;
    top: 6px;
    right: 6px;
    color: $primary-color;
  }

  &__rename {
    position: absolute;
    top: 6px;
    left: 30px;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    background: rgba($primary-color, 0.15);
    color: $primary-color;
    cursor: pointer;
    transition: all $transition-base;

    &:hover {
      background: $primary-color;
      color: #fff;
    }
  }

  &__delete {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    background: rgba($error-color, 0.15);
    color: $error-color;
    cursor: pointer;
    transition: all $transition-base;

    &:hover {
      background: $error-color;
      color: #fff;
    }

    &:disabled {
      cursor: progress;
      opacity: 0.7;
    }
  }
}

// 加载旋转图标（添加/删除等异步操作反馈）
.is-spin {
  animation: pet-spin 0.8s linear infinite;
}

@keyframes pet-spin {
  to {
    transform: rotate(360deg);
  }
}

.pet-add-btn {
  margin-top: $spacing-md;
}

// 添加自定义桌宠表单
.add-pet-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__field {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
  }

  &__file {
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__support {
    margin: 0;
    font-size: $font-size-xs;
    color: $text-light;
  }

  &__hint {
    margin: 0;
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
    justify-content: flex-end;
    margin-top: $spacing-sm;
  }
}
</style>
