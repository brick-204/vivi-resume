<template>
  <div class="settings-panel">
    <!-- 头部 -->
    <div class="panel__header">
      <h2 class="panel__title">
        <Icon icon="mdi:cog-outline" :width="24" />
        设置
      </h2>
    </div>

  <div class="settings-layout">
    <div class="settings-layout__main">

    <!-- 本地目录绑定 -->
    <div class="settings-section" data-toc="directory">
      <h3 class="settings-section__title">
        <Icon icon="mdi:folder-outline" :width="20" />
        本地目录绑定
      </h3>
      <p class="settings-section__desc">
        绑定本地目录后，简历数据将以 JSON 文件形式存储在指定文件夹中，方便备份和版本管理。
        未绑定时，数据默认存储在应用内置 IndexedDB 中。
      </p>

      <!-- 浏览器不支持 -->
      <div v-if="!settingsStore.isSupported" class="settings-section__unsupported">
        <Icon icon="mdi:alert-circle-outline" :width="16" />
        <span>当前环境不支持本地目录功能，请使用桌面端或 Chrome / Edge 浏览器</span>
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
          点击后选择一个本地文件夹，数据将自动从应用同步到该目录
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
          点击「重新同步」将目录中的最新数据读取到应用中；解绑后数据将恢复到应用内置存储
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
          目录访问权限已过期，需要重新授权才能访问目录中的数据
        </p>
      </div>
    </div>

    <!-- 回收设置（回收站 + 回收箱） -->
    <div class="settings-section" data-toc="recycle">
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
    <div class="settings-section" data-toc="pet">
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

      <!-- 空闲冒泡（桌宠设置子分区） -->
      <div class="settings-subsection">
        <h4 class="settings-subsection__title">
          <Icon icon="mdi:clock-outline" :width="18" />
          空闲冒泡
        </h4>
        <p class="settings-subsection__desc">
          桌宠空闲时会按设定间隔自动说一句话刷存在感。
        </p>
        <div class="settings-section__row">
          <span class="settings-section__label">冒泡间隔</span>
          <NInputNumber
            v-model:value="idleInterval"
            :min="1"
            :max="60"
            :step="1"
            size="small"
            style="width: 140px"
          >
            <template #suffix>分钟</template>
          </NInputNumber>
        </div>
      </div>

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
          开启后，桌宠在保存、导出、进入编辑器、被悬停、点击、拖拽等时刻会由 AI 现编一句话，更生动（需先配置 AI 服务商）。空闲自动冒泡和休息提醒默认仍用预设话术，可在下方子开关开启。<strong>注意：每次触发都会消耗 AI token，请根据你的用量酌情开启。</strong>
        </p>
        <div class="settings-section__row">
          <span class="settings-section__label">开启 AI 动态话术</span>
          <NSwitch v-model:value="petAIChatEnabled" />
        </div>
        <div class="settings-section__row" :class="{ 'is-disabled': !petAIChatEnabled }">
          <span class="settings-section__label">空闲/休息提醒也用 AI</span>
          <NSwitch v-model:value="idleAiEnabled" :disabled="!petAIChatEnabled" />
        </div>
        <p class="settings-subsection__desc settings-subsection__desc--hint">
          开启后空闲自动冒泡和休息提醒也由 AI 现编（更烧 token）。
        </p>
      </div>
    </div>

    <!-- 面试提示 -->
    <div class="settings-section" data-toc="interview">
      <h3 class="settings-section__title">
        <Icon icon="mdi:briefcase-clock-outline" :width="20" />
        面试提示
      </h3>
      <p class="settings-section__desc">
        当有进行中的面试且下一面在 3 天内时，在指定位置显示倒计时提醒。临场（≤24 小时）会变红脉冲提示。
      </p>
      <div class="settings-section__row">
        <span class="settings-section__label">开启面试提示</span>
        <NSwitch v-model:value="bannerEnabled" />
      </div>
      <div class="settings-section__row" :class="{ 'is-disabled': !bannerEnabled }">
        <span class="settings-section__label">显示位置</span>
        <NSelect
          v-model:value="bannerPosition"
          :options="bannerPositionOptions"
          :disabled="!bannerEnabled"
          size="small"
          style="width: 180px"
        />
      </div>
    </div>

    <!-- 地图设置 -->
    <div class="settings-section" data-toc="map">
      <h3 class="settings-section__title">
        <Icon icon="mdi:map-marker-outline" :width="20" />
        地图设置
      </h3>
      <p class="settings-section__desc">
        面试足迹 tab 与面试地点搜索依赖高德地图 JS API。请在高德开放平台申请「Web 端（JS API）」
        <span class="settings-section__keyword">
          Key 后填入下方。
          <NPopover trigger="hover" placement="top" :width="260">
            <template #trigger>
              <Icon class="settings-section__keyword-icon" icon="mdi:information-outline" :width="14" />
            </template>
            <div class="settings-section__popover">
              <div class="settings-section__popover-title">如何在高德获取 key</div>
              <a
                class="settings-section__popover-link"
                href="https://blog.csdn.net/brick_404/article/details/163471111?spm=1011.2124.3001.6209"
                target="_blank"
                rel="noopener"
              >
                查看图文教程
                <Icon icon="mdi:open-in-new" :width="12" />
              </a>
            </div>
          </NPopover>
        </span>
      </p>
      <div class="settings-section__row">
        <span class="settings-section__label">启用地图功能</span>
        <NSwitch v-model:value="amapEnabled" />
        <span class="settings-section__hint">关闭后面试足迹与地点搜索的地图功能将不可用</span>
      </div>
      <div class="settings-section__row">
        <span class="settings-section__label settings-section__label--with-info">
          面试足迹显示时间范围
          <NPopover trigger="hover" placement="top" :width="260">
            <template #trigger>
              <Icon class="settings-section__info-icon" icon="mdi:information-outline" :width="14" />
            </template>
            <div class="settings-section__popover">
              超过 N 个月的面试不在足迹地图显示；单场面试可在「我的面试」编辑页设为永久展示
            </div>
          </NPopover>
        </span>
        <NSelect
          v-model:value="footprintHideMonths"
          :options="footprintHideMonthsOptions"
          style="width: 180px"
        />
      </div>
      <div class="settings-section__row">
        <span class="settings-section__label">高德地图 Key</span>
        <NInput
          v-model:value="amapKey"
          type="password"
          show-password-on="click"
          placeholder="高德开放平台 Web 端 JS API Key"
          style="width: 320px"
        />
      </div>
      <div class="settings-section__row">
        <span class="settings-section__label">安全密钥</span>
        <NInput
          v-model:value="amapSecurityCode"
          type="password"
          show-password-on="click"
          placeholder="JS API 安全密钥（securityJsCode，必填）"
          style="width: 320px"
        />
      </div>
      <p class="settings-section__desc settings-section__desc--hint">
        Key 与安全密钥以明文存储于本机（应用内置存储或本地目录），未加密。JS API 2.0 强制要求安全密钥，不配则地点搜索等服务无法使用。请使用个人 Key 并在高德控制台配置域名白名单。
      </p>
    </div>

    </div>

    <!-- 小目录（TOC）：宽屏右侧 sticky 竖排，窄屏折成顶部横向条 -->
    <nav class="settings-toc" aria-label="设置目录">
      <button
        v-for="item in tocItems"
        :key="item.id"
        type="button"
        class="settings-toc__item"
        :class="{ 'is-active': activeToc === item.id }"
        @click="scrollToSection(item.id)"
      >
        <Icon :icon="item.icon" :width="16" />
        <span class="settings-toc__label">{{ item.label }}</span>
      </button>
    </nav>
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
      :content="`解绑后目录「${settingsStore.directoryName}」中的文件默认保留，应用将切换回内置存储。`"
      @update:show="v => { if (!v) showUnbindConfirm = false }"
    >
      <div class="unbind-copy-option">
        <NCheckbox v-model:checked="copyToBrowser">
          同时将目录数据复制到应用内置存储
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
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NSelect, NCheckbox, NInput, NSwitch, NInputNumber, NPopover } from 'naive-ui'
import { useSettingsStore } from '@/stores/settingsStore'
import { useResumeStore } from '@/stores/resumeStore'
import type { InterviewBannerPosition } from '@/utils/storageAdapter'
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

// 设置小目录（TOC）：4 个分区，点击平滑滚动，IntersectionObserver 高亮当前
const tocItems = [
  { id: 'directory', label: '本地目录', icon: 'mdi:folder-outline' },
  { id: 'recycle', label: '回收设置', icon: 'mdi:delete-clock-outline' },
  { id: 'pet', label: '桌宠设置', icon: 'mdi:cat' },
  { id: 'interview', label: '面试提示', icon: 'mdi:briefcase-clock-outline' },
  { id: 'map', label: '地图设置', icon: 'mdi:map-marker-outline' },
] as const
const activeToc = ref<string>('directory')
let tocObserver: IntersectionObserver | null = null
// ponytail: 点击 TOC 跳转时锁定，滚动动画期间忽略 observer 回调，避免高亮在路径上的 section 间乱跳
let scrollLockTimer: ReturnType<typeof setTimeout> | null = null

const scrollToSection = (id: string) => {
  // 点击立即高亮，不等 observer（窄屏 sticky TOC 遮顶时 observer 可能漏判）
  activeToc.value = id
  // 锁定 observer，覆盖平滑滚动动画时长（约 400-600ms），动画结束后再解锁
  if (scrollLockTimer) clearTimeout(scrollLockTimer)
  scrollLockTimer = setTimeout(() => { scrollLockTimer = null }, 700)
  const el = document.querySelector<HTMLElement>(`.settings-section[data-toc="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  // ponytail: IntersectionObserver 高亮当前可视分区。
  // root 必须显式设为 .dashboard__content（实际滚动容器），否则默认视口与 scrollIntoView 的滚动容器不一致，
  // rootMargin 裁剪坐标系错位 → 滚动时高亮乱跳。
  const scrollRoot = document.querySelector<HTMLElement>('.dashboard__content')
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>('.settings-section[data-toc]')
  )
  tocObserver = new IntersectionObserver(
    (entries) => {
      // 点击跳转动画期间锁定，不更新高亮
      if (scrollLockTimer) return
      // 取最靠上且仍可见的那个
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) {
        const id = (visible[0].target as HTMLElement).dataset.toc
        if (id) activeToc.value = id
      } else {
        // ponytail: 观察带内无命中（最后一个/较短 section 滚到顶时易发生），
        // 回退取离滚动容器顶部最近的 section，避免高亮错位到上一个
        let best: HTMLElement | null = null
        let bestTop = Infinity
        for (const s of sections) {
          // 相对滚动容器顶部的偏移：getBoundingClientRect.top - root.top
          const top = s.getBoundingClientRect().top - (scrollRoot?.getBoundingClientRect().top ?? 0)
          // 顶部已滚过容器顶（top<=0）取最接近 0 的；否则取第一个还在容器下方的
          if (top <= 0 && Math.abs(top) < bestTop) {
            bestTop = Math.abs(top)
            best = s
          }
        }
        // 全部在容器下方（页面顶部）→ 取第一个
        if (!best && sections[0]) best = sections[0]
        const id = best?.dataset.toc
        if (id) activeToc.value = id
      }
    },
    // rootMargin 相对 scrollRoot 裁剪：观察带为容器顶部 20%~40% 区间
    { root: scrollRoot, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
  )
  sections.forEach(s => tocObserver!.observe(s))
})

onBeforeUnmount(() => {
  tocObserver?.disconnect()
  tocObserver = null
  if (scrollLockTimer) { clearTimeout(scrollLockTimer); scrollLockTimer = null }
})

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

// idle/rest 也走 AI 子开关（依赖主开关，主关时 UI disabled）
const idleAiEnabled = computed({
  get: () => settingsStore.idleAiEnabled,
  set: (val: boolean) => { settingsStore.updateIdleAiEnabled(val) },
})

// 空闲冒泡间隔（分钟）
const idleInterval = computed({
  get: () => settingsStore.idleIntervalMinutes,
  set: (val: number | null) => {
    if (val == null) return
    settingsStore.updateIdleIntervalMinutes(val)
  },
})

// 面试提示横幅：开关 + 位置
const bannerEnabled = computed({
  get: () => settingsStore.interviewBannerEnabled,
  set: (val: boolean) => { settingsStore.updateInterviewBannerEnabled(val) },
})
const bannerPosition = computed({
  get: () => settingsStore.interviewBannerPosition,
  set: (val: InterviewBannerPosition) => { settingsStore.updateInterviewBannerPosition(val) },
})
const amapKey = computed({
  get: () => settingsStore.amapKey,
  set: (val: string) => { settingsStore.updateAmapKey(val) },
})
const amapSecurityCode = computed({
  get: () => settingsStore.amapSecurityCode,
  set: (val: string) => { settingsStore.updateAmapSecurityCode(val) },
})
const amapEnabled = computed({
  get: () => settingsStore.amapEnabled,
  set: (val: boolean) => { settingsStore.updateAmapEnabled(val) },
})
const footprintHideMonths = computed({
  get: () => settingsStore.footprintHideMonths,
  set: (val: number) => { settingsStore.updateFootprintHideMonths(val) },
})
const footprintHideMonthsOptions = [
  { label: '不屏蔽', value: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1} 个月`, value: i + 1 })),
]
const bannerPositionOptions: { label: string; value: InterviewBannerPosition }[] = [
  { label: '左下角', value: 'bottom-left' },
  { label: '右下角', value: 'bottom-right' },
  { label: '顶部横幅', value: 'top-bar' },
  { label: '侧边栏顶部', value: 'nav-top' },
]

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
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
}

// 两栏布局：主内容 + 右侧 TOC
.settings-layout {
  display: flex;
  gap: $spacing-xl;
  align-items: flex-start;
}

.settings-layout__main {
  flex: 1;
  min-width: 0; // ponytail: 允许收缩，防止内容溢出挤掉 TOC
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
}

// 小目录（TOC）
.settings-toc {
  position: sticky;
  top: 0;
  flex-shrink: 0;
  width: 140px;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-sm 0;

  &__item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-xs $spacing-sm;
    border: none;
    background: transparent;
    border-left: 2px solid transparent;
    border-radius: 0 $radius-sm $radius-sm 0;
    color: $text-secondary;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: all $transition-base;
    font-family: $font-family;
    text-align: left;

    &:hover {
      color: $text-primary;
      background: var(--bg-glass-hover);
    }

    &.is-active {
      color: $primary-color;
      border-left-color: $primary-color;
      background: rgba($primary-color, 0.08);
      font-weight: 600;
    }
  }

  &__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// 锚点跳转时贴顶留呼吸空间
.settings-section[data-toc] {
  scroll-margin-top: $spacing-md;
}

// 窄屏（≤1024px）：TOC 折成顶部横向标签条，主内容全宽
@include tablet {
  .settings-layout {
    flex-direction: column;
    gap: $spacing-md;
  }

  // sticky TOC 条吸顶会遮住 section 顶部，跳转时多留一截
  .settings-section[data-toc] {
    scroll-margin-top: 60px;
  }

  .settings-layout__main {
    max-width: none;
  }

  .settings-toc {
    position: sticky;
    top: 0;
    z-index: 2;
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: $spacing-sm;
    padding: $spacing-sm 0;
    order: -1; // ponytail: 窄屏折顶部——DOM 里 TOC 在 main 之后，用 order 排到前面
    background: $bg-secondary; // ponytail: 吸顶时遮住下方滚动内容，避免穿透

    &__item {
      border-left: none;
      border-bottom: 2px solid transparent;
      border-radius: $radius-sm;
      padding: $spacing-xs $spacing-sm;

      &.is-active {
        border-left: none;
        border-bottom-color: $primary-color;
      }
    }
  }
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

    &--hint {
      margin-top: $spacing-sm;
      margin-bottom: 0;
      font-size: $font-size-xs;
      opacity: 0.8;
    }
  }

  &__keyword {
    position: relative;
    display: inline-block;

    &-icon {
      position: absolute;
      top: 0;
      right: 0;
      transform: translate(75%, -15%);
      color: $text-light;
      cursor: pointer;
      transition: color $transition-base;

      &:hover {
        color: $primary-color;
      }
    }
  }

  &__popover {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    &-title {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $text-primary;
    }

    &-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: $primary-color;
      text-decoration: none;
      font-size: $font-size-sm;
      transition: opacity $transition-base;

      &:hover {
        opacity: 0.7;
      }
    }
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

    &--with-info {
      position: relative;
      padding-right: 18px;
    }
  }

  &__info-icon {
    position: absolute;
    top: -2px;
    right: 0;
    color: $text-light;
    cursor: help;
    transition: color $transition-fast;

    &:hover {
      color: $primary-light;
    }
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

    // 子开关下方的小提示（更小更淡，紧贴上方行）
    &--hint {
      font-size: $font-size-xs;
      opacity: 0.85;
      margin: $spacing-sm 0 0;
    }
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
