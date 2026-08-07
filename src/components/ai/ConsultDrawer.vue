<template>
  <n-drawer
    :show="drawerShow"
    :width="pinned ? pinnedWidth : drawerWidth"
    :show-mask="!pinned"
    :mask-closable="!pinned"
    :placement="placement"
    :auto-focus="false"
    @update:show="handleShowChange"
  >
    <n-drawer-content :native-scrollbar="false" closable class="consult-drawer">
      <template #header>
        <div class="consult-header">
          <Icon icon="mdi:comment-question-outline" :width="20" />
          <span>AI 咨询</span>
          <button
            class="consult-header__pin"
            :class="{ 'is-active': pinned }"
            type="button"
            :title="pinned ? '取消常驻' : '常驻侧栏'"
            :aria-label="pinned ? '取消常驻' : '常驻侧栏'"
            @click="togglePin"
          >
            <Icon
              :icon="pinned ? 'mdi:pin' : 'mdi:pin-outline'"
              :width="18"
            />
          </button>
          <button
            class="consult-header__placement"
            type="button"
            :title="placement === 'right' ? '切换到左侧' : '切换到右侧'"
            :aria-label="placement === 'right' ? '切换到左侧' : '切换到右侧'"
            @click="togglePlacement"
          >
            <Icon
              :icon="
                placement === 'right'
                  ? 'mdi:format-horizontal-align-left'
                  : 'mdi:format-horizontal-align-right'
              "
              :width="18"
            />
          </button>
          <n-popover
            v-model:show="historyPopoverShow"
            trigger="click"
            placement="bottom-end"
            :width="triggerWidth"
          >
            <template #trigger>
              <button
                class="consult-header__history"
                type="button"
                title="历史会话"
                aria-label="历史会话"
              >
                <Icon icon="mdi:history" :width="18" />
              </button>
            </template>
            <div class="consult-session-list">
              <div class="consult-session-list__header">
                历史会话
                <span class="consult-session-list__limit">仅记录最新十条</span>
              </div>
              <div
                v-if="sessions.length === 0"
                class="consult-session-list__empty"
              >
                暂无历史会话
              </div>
              <div
                v-for="s in sessions"
                :key="s.id"
                class="consult-session-list__item"
                :class="{
                  'is-active': s.id === currentSessionId,
                  'is-disabled': isStreaming,
                  'is-editing': editingId === s.id,
                  'is-closed': s.closed,
                }"
                @click="s.closed ? onReopenSession(s.id) : onPickHistory(s.id)"
              >
                <n-input
                  v-if="editingId === s.id"
                  v-model:value="editingTitle"
                  size="tiny"
                  :autofocus="true"
                  class="consult-session-list__edit"
                  @click.stop
                  @keydown.enter.prevent="commitRename"
                  @keydown.esc.prevent="cancelRename"
                  @blur="commitRename"
                />
                <template v-else>
                  <Icon
                    :icon="
                      s.closed
                        ? 'mdi:comment-off-outline'
                        : s.id === currentSessionId
                          ? 'mdi:comment-text-outline'
                          : 'mdi:comment-text-multiple-outline'
                    "
                    :width="16"
                    class="consult-session-list__icon"
                  />
                  <span
                    class="consult-session-list__title"
                    @dblclick.stop="startRename(s.id, s.title)"
                    >{{ s.title || "新会话" }}</span
                  >
                  <span v-if="s.closed" class="consult-session-list__closed"
                    >已关闭</span
                  >
                  <span class="consult-session-list__time">{{
                    relativeTime(s.updatedAt)
                  }}</span>
                  <Icon
                    icon="mdi:close"
                    :width="14"
                    class="consult-session-list__del"
                    @click.stop="
                      s.closed ? onRemoveSession(s.id) : onDeleteSession(s.id)
                    "
                  />
                </template>
              </div>
            </div>
          </n-popover>
          <n-button
            size="tiny"
            quaternary
            class="consult-header__new"
            :disabled="isStreaming"
            @click="onNewSession"
          >
            <template #icon>
              <Icon icon="mdi:plus" :width="16" />
            </template>
            新会话
          </n-button>
        </div>
      </template>

      <!-- 会话标签（横向 tab，VS Code 风格） -->
      <div v-if="openTabs.length > 0" class="consult-tabs">
        <div class="consult-tabs__list">
          <div
            v-for="s in openTabs"
            :key="s.id"
            class="consult-tabs__tab"
            :class="{
              'is-active': s.id === currentSessionId,
              'is-disabled': isStreaming,
              'is-editing': editingId === s.id,
            }"
            :title="s.title || '新会话'"
            @click="onSwitchSession(s.id)"
          >
            <n-input
              v-if="editingId === s.id"
              v-model:value="editingTitle"
              size="tiny"
              :autofocus="true"
              class="consult-tabs__edit"
              @click.stop
              @keydown.enter.prevent="commitRename"
              @keydown.esc.prevent="cancelRename"
              @blur="commitRename"
            />
            <span
              v-else
              class="consult-tabs__title"
              @dblclick.stop="startRename(s.id, s.title)"
              >{{ s.title || "新会话" }}</span
            >
            <Icon
              icon="mdi:close"
              :width="14"
              class="consult-tabs__del"
              @click.stop="onDeleteSession(s.id)"
            />
          </div>
        </div>
      </div>

      <!-- 对话区 -->
      <div ref="messagesRef" class="consult-messages">
        <template v-if="visibleMessages.length === 0 && !isStreaming">
          <div
            v-if="!hasActiveAIConfig"
            class="consult-empty consult-empty--noai"
          >
            <Icon icon="mdi:robot-confused-outline" :width="40" />
            <p>尚未启用 AI 服务</p>
            <p class="consult-empty__hint">
              配置并启用一个 AI 服务商后即可开始对话
            </p>
            <n-button size="small" type="primary" @click="goToAISettings">
              去配置 AI 服务
            </n-button>
          </div>
          <div v-else class="consult-empty">
            <Icon icon="mdi:robot-outline" :width="40" />
            <p>问我任何关于简历或系统使用的问题</p>
            <p class="consult-empty__hint">
              可点下方「选择简历」注入上下文，让我针对你的简历内容回答
            </p>
          </div>
          <!-- 隐私提示（仅已配置 AI 的欢迎页显示） -->
          <div v-if="hasActiveAIConfig" class="consult-privacy-notice">
            <Icon icon="mdi:shield-check-outline" :width="14" />
            <span>您的姓名、联系方式等个人敏感信息已自动替换为占位符，您隐藏的模块和字段也不会发送给 AI，仅用于回答您关于简历的问题</span>
          </div>
        </template>

        <!-- 历史归档（被压缩的更早对话，分页展开） -->
        <template v-if="displayedArchived.length > 0 || hasMoreArchived">
          <template v-for="(msg, i) in displayedArchived" :key="`arch-${i}`">
            <div
              v-if="msg.kind === 'user-question'"
              class="consult-bubble consult-bubble--user consult-bubble--archived"
            >
              {{ msg.content }}
            </div>
            <div
              v-else-if="msg.kind === 'assistant-answer'"
              class="consult-bubble consult-bubble--ai consult-bubble--archived"
            >
              <div
                v-html="
                  renderMarkdown(
                    typeof msg.content === 'string' ? msg.content : '',
                  )
                "
              />
            </div>
          </template>
          <button
            v-if="hasMoreArchived"
            type="button"
            class="consult-arch-more"
            @click="loadMoreArchived"
          >
            <Icon icon="mdi:chevron-up" :width="14" />
            展开更早的对话
          </button>
          <div class="consult-ctx consult-ctx--notice consult-arch-divider">
            <Icon icon="mdi:archive-outline" :width="14" />
            <span>以上为已归档的早期对话</span>
          </div>
        </template>

        <template v-for="(msg, i) in visibleMessages" :key="i">
          <!-- 简历上下文消息：居中 chip -->
          <div v-if="msg.kind === 'resume-context'" class="consult-ctx">
            <Icon icon="mdi:file-document-outline" :width="14" />
            <span>已注入简历上下文（{{ attachedResumeLabels(msg) }}）</span>
          </div>

          <!-- 历史压缩提示：居中 chip -->
          <div
            v-else-if="msg.kind === 'compress-notice'"
            class="consult-ctx consult-ctx--notice"
          >
            <Icon icon="mdi:archive-outline" :width="14" />
            <span>{{ msg.content }}</span>
          </div>

          <!-- 用户提问：右对齐 -->
          <div
            v-else-if="msg.kind === 'user-question'"
            class="consult-bubble consult-bubble--user"
          >
            {{ msg.content }}
          </div>

          <!-- AI 回复：左对齐 + Markdown 渲染 -->
          <div
            v-else-if="msg.kind === 'assistant-answer'"
            class="consult-bubble consult-bubble--ai"
          >
            <div
              v-html="
                renderMarkdown(
                  typeof msg.content === 'string' ? msg.content : '',
                )
              "
            />
          </div>
        </template>

        <!-- 流式输出中的临时气泡 -->
        <div
          v-if="isStreaming"
          class="consult-bubble consult-bubble--ai consult-bubble--streaming"
        >
          <span v-if="!streamingText" class="consult-bubble__placeholder"
            >正在思考…</span
          >
          <template v-else>
            <span>{{ streamingText }}</span>
            <span class="consult-bubble__cursor" aria-hidden="true">▌</span>
          </template>
        </div>
      </div>

      <!-- 简历选择条 -->
      <div class="consult-resume-bar">
        <n-upload
          :show-file-list="false"
          :before-upload="onPickFile"
          accept="image/*,.txt,.md,.markdown,.docx,.pdf,.json,.csv,.log,.xml,.html,.js,.ts,.py"
          multiple
        >
          <n-button
            size="small"
            dashed
            title="上传文件/图片"
            aria-label="上传文件/图片"
          >
            <template #icon>
              <Icon icon="mdi:plus" :width="16" />
            </template>
          </n-button>
        </n-upload>
        <n-popover trigger="click" placement="top-start" :width="280">
          <template #trigger>
            <n-button size="small" dashed>
              <template #icon>
                <Icon icon="mdi:file-document-multiple-outline" :width="16" />
              </template>
              选择简历
              <span
                v-if="pendingResumeIds.length"
                class="consult-resume-bar__count"
              >
                {{ pendingResumeIds.length }}
              </span>
            </n-button>
          </template>
          <div class="consult-resume-pop">
            <div class="consult-resume-pop__title">
              选择简历注入上下文（可多选）
            </div>
            <div
              v-if="resumeList.length === 0"
              class="consult-resume-pop__empty"
            >
              暂无简历
            </div>
            <div
              v-for="r in resumeList"
              :key="r.id"
              class="consult-resume-pop__item"
              :class="{ 'is-checked': pendingResumeIds.includes(r.id) }"
              @click="togglePendingResume(r.id)"
            >
              <Icon
                :icon="
                  pendingResumeIds.includes(r.id)
                    ? 'mdi:checkbox-marked'
                    : 'mdi:checkbox-blank-outline'
                "
                :width="18"
              />
              <span class="consult-resume-pop__name">{{
                r.title || "未命名简历"
              }}</span>
              <span
                v-if="r.id === editingResumeId"
                class="consult-resume-pop__cur"
                >当前</span
              >
            </div>
            <div class="consult-resume-pop__hint">
              选中的简历会与下一条提问一起发送
            </div>
          </div>
        </n-popover>

        <div class="consult-resume-bar__chips">
          <span
            v-for="id in pendingResumeIds"
            :key="id"
            class="consult-resume-bar__chip"
          >
            {{ resumeTitle(id) }}
            <Icon
              icon="mdi:close"
              :width="12"
              @click="togglePendingResume(id)"
            />
          </span>
          <span
            v-for="a in pendingAttachments"
            :key="a.name"
            class="consult-resume-bar__chip consult-resume-bar__chip--file"
            :title="a.name"
          >
            <Icon
              :icon="
                a.kind === 'image'
                  ? 'mdi:image-outline'
                  : 'mdi:file-document-outline'
              "
              :width="12"
            />
            <span class="consult-resume-bar__filename">{{ a.name }}</span>
            <Icon
              icon="mdi:close"
              :width="12"
              @click="removePendingAttachment(a.name)"
            />
          </span>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="consult-input">
        <n-input
          v-model:value="inputText"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 5 }"
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          :disabled="isStreaming"
          @keydown.enter.exact.prevent="onSend"
        />
        <n-button
          v-if="!isStreaming"
          type="primary"
          :disabled="!canSend"
          @click="onSend"
        >
          <template #icon>
            <Icon icon="mdi:send" :width="16" />
          </template>
        </n-button>
        <n-button v-else type="error" ghost @click="onAbort">
          <template #icon>
            <Icon icon="mdi:stop" :width="16" />
          </template>
        </n-button>
      </div>
    </n-drawer-content>
  </n-drawer>

  <!-- 常驻态左边缘拖拽调宽条：teleport 到 body，fixed 定位脱离抽屉滚动区 -->
  <teleport to="body">
    <div
      v-if="pinned && bodyVisible"
      class="consult-pin-resize"
      :style="
        placement === 'right'
          ? { right: pinnedWidth - 3 + 'px' }
          : { left: pinnedWidth - 3 + 'px' }
      "
      title="拖拽调节宽度"
      @mousedown="onPinDragStart"
    ></div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import {
  NDrawer,
  NDrawerContent,
  NButton,
  NInput,
  NPopover,
  NUpload,
} from "naive-ui";
import type { ConsultMessage } from "@/types/consult";
import { useConsultStore } from "@/stores/consultStore";
import { useResumeStore } from "@/stores/resumeStore";
import { useAIConfigStore } from "@/stores/aiConfigStore";
import { markdownToHtml } from "@/utils/markdownConverter";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { blobToBase64 } from "@/utils/storage";
import { parseFile, getSupportedFileType } from "@/utils/fileParser";
import { message as naiveMessage } from "@/plugins/naive-ui";

const props = defineProps<{
  show: boolean;
  /** 抽屉方向：靠左/靠右，所有态都生效，默认右 */
  placement?: "left" | "right";
}>();
const emit = defineEmits<{
  "update:show": [v: boolean];
  "update:placement": [v: "left" | "right"];
}>();

/** 抽屉方向，双向绑父组件；localStorage 由 App.vue 统一写 */
const placement = computed<"left" | "right">({
  get: () => props.placement ?? "right",
  set: (v) => emit("update:placement", v),
});
const togglePlacement = () => {
  placement.value = placement.value === "right" ? "left" : "right";
};

const consultStore = useConsultStore();
const resumeStore = useResumeStore();
const aiConfigStore = useAIConfigStore();
const router = useRouter();

// 响应式状态用 storeToRefs 解构（保持响应式），actions 直接解构
const {
  sessions,
  currentSessionId,
  currentSession,
  currentMessages,
  pendingResumeIds,
  pendingAttachments,
  isStreaming,
  streamingText,
} = storeToRefs(consultStore);
const {
  sendMessage,
  abort,
  createSession,
  switchSession,
  deleteSession,
  reopenSession,
  removeSession,
  renameSession,
  clearPending,
  togglePendingResume,
  addPendingAttachment,
  removePendingAttachment,
} = consultStore;

// resumeStore 的属性访问直接用 store 实例（模板和 computed 里自动响应式）
const resumeList = computed(() => resumeStore.resumeList);

const route = useRoute();
// 仅当真正在编辑器中打开某份简历时才标「当前」：
// resumeStore.currentResume 在 Dashboard 等页面会残留上次打开的 id，不能作为「正在编辑」判据
const editingResumeId = computed(() =>
  route.name === "editor"
    ? ((route.params.id as string | undefined) ?? null)
    : null,
);

/** 是否有已激活的 AI 服务商；无则在抽屉内提示并引导去配置 */
const hasActiveAIConfig = computed(() => Boolean(aiConfigStore.activeConfig));

const goToAISettings = () => {
  emit("update:show", false);
  router.push({ path: "/dashboard", query: { tab: "ai" } });
};

/** 纯文本文件扩展名（parseFile 不支持的，用 file.text() fallback） */
const TEXT_EXTS = [
  ".txt",
  ".json",
  ".csv",
  ".log",
  ".xml",
  ".html",
  ".js",
  ".ts",
  ".py",
];

/** 上传文件：图片转 Base64 data URL 走多模态，文本提取内容注入消息文本 */
const onPickFile = async ({
  file,
}: {
  file: { file?: File; name: string };
}) => {
  const f = file.file;
  if (!f) return false;
  try {
    if (f.type.startsWith("image/")) {
      const dataUrl = await blobToBase64(f);
      addPendingAttachment({ name: f.name, dataUrl, kind: "image" });
    } else {
      let text: string;
      if (getSupportedFileType(f)) {
        text = (await parseFile(f)).text;
      } else if (
        TEXT_EXTS.some((e) => f.name.toLowerCase().endsWith(e)) ||
        f.type.startsWith("text/")
      ) {
        text = await f.text();
      } else {
        naiveMessage.warning(
          "不支持的文件格式（支持图片 / md / docx / pdf / txt 等）",
        );
        return false;
      }
      text = text.slice(0, 20000);
      if (!text) {
        naiveMessage.warning("文件内容为空");
        return false;
      }
      addPendingAttachment({ name: f.name, dataUrl: text, kind: "text" });
    }
  } catch {
    naiveMessage.error("文件读取失败");
  }
  return false; // 阻止 n-upload 自动上传到 url
};

/** 会话列表 popover 宽度与抽屉内容区对齐 */
const triggerWidth = computed(() => Math.min(520, drawerWidth.value - 32));

/** 相对时间：刚刚 / N分钟前 / N小时前 / N天前 */
const relativeTime = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  return `${Math.floor(diff / 86_400_000)}天前`;
};

const inputText = ref("");
const messagesRef = ref<HTMLElement | null>(null);

// 会话重命名编辑态
const editingId = ref<string | null>(null);
const editingTitle = ref("");

// 历史会话下拉显隐
const historyPopoverShow = ref(false);

/** 标签栏可见的会话：过滤掉已关闭（软删除）的 */
const openTabs = computed(() => sessions.value.filter((s) => !s.closed));

const drawerWidth = computed(() => Math.min(560, window.innerWidth - 40));

// ========== 常驻态（📌 侧栏模式） ==========
// pinned: 抽屉浮于内容之上、无遮罩、不拦截外侧点击，可边操作编辑器边用 AI 咨询
const MIN_PIN_WIDTH = 560;
const pinned = ref(localStorage.getItem("consult-pinned") === "1");
// 常驻宽度，最小 560，受屏幕宽约束；首次取已存值否则回退 drawerWidth
const pinnedWidth = ref(
  Math.min(
    window.innerWidth - 40,
    Math.max(
      MIN_PIN_WIDTH,
      Number(localStorage.getItem("consult-pin-width")) || drawerWidth.value,
    ),
  ),
);
// 抽屉主体是否展开（常驻态下关闭=收起主体但保持 pinned，下次点 FAB 直接侧栏展开）
const bodyVisible = ref(false);

/** n-drawer 实际 show：常驻态跟 bodyVisible，非常驻态跟 props.show */
const drawerShow = computed(() =>
  pinned.value ? bodyVisible.value : props.show,
);

const togglePin = () => {
  pinned.value = !pinned.value;
  localStorage.setItem("consult-pinned", pinned.value ? "1" : "0");
  if (pinned.value) {
    // 进入常驻：展开主体
    bodyVisible.value = true;
    emit("update:show", true);
  }
  // 退出常驻：bodyVisible 不再驱动 drawerShow，回到 props.show 控制
};

// 常驻态拖拽调宽（左边缘往左拖变宽，方向与编辑器列拖拽相反，故自写不复用 ResizeHandle）
let pinDragStartX = 0;
let pinDragStartWidth = 0;
let pinDragRaf: number | null = null;
let pinDragPending: number | null = null;
const onPinDragStart = (e: MouseEvent) => {
  e.preventDefault();
  pinDragStartX = e.clientX;
  pinDragStartWidth = pinnedWidth.value;
  document.body.style.cursor = "col-resize";
  document.addEventListener("mousemove", onPinDragMove);
  document.addEventListener("mouseup", onPinDragEnd);
};
const onPinDragMove = (e: MouseEvent) => {
  // 靠右抽屉左边缘：往左拖(delta<0)变宽 → start - delta；靠左抽屉右边缘：往右拖(delta>0)变宽 → start + delta
  const delta = e.clientX - pinDragStartX;
  const next = placement.value === "right"
    ? pinDragStartWidth - delta
    : pinDragStartWidth + delta;
  pinDragPending = Math.min(
    window.innerWidth - 40,
    Math.max(MIN_PIN_WIDTH, next),
  );
  if (pinDragRaf === null) {
    pinDragRaf = requestAnimationFrame(() => {
      pinDragRaf = null;
      if (pinDragPending !== null) pinnedWidth.value = pinDragPending;
    });
  }
};
const onPinDragEnd = () => {
  if (pinDragRaf !== null) {
    cancelAnimationFrame(pinDragRaf);
    pinDragRaf = null;
  }
  if (pinDragPending !== null) pinnedWidth.value = pinDragPending;
  pinDragPending = null;
  document.body.style.cursor = "";
  localStorage.setItem("consult-pin-width", String(pinnedWidth.value));
  document.removeEventListener("mousemove", onPinDragMove);
  document.removeEventListener("mouseup", onPinDragEnd);
};

/** UI 可见消息（过滤掉 system 与 history-summary；保留 compress-notice 作为提示 chip） */
const visibleMessages = computed<ConsultMessage[]>(() =>
  currentMessages.value.filter((m) => m.kind && m.kind !== "history-summary"),
);

/** ===== 历史归档展开（分页） =====
 * archivedMessages 是压缩时从 messages 移出的原始 user/assistant 段（含旧 history-summary），
 * 按压缩批次时间正序追加。展开时过滤掉 history-summary（旧摘要冗余），只显示 user/assistant。
 * 分页从最近的归档往远处翻：取末尾 N 条，点"展开更早"扩大 N。
 */
const ARCHIVE_PAGE_SIZE = 20;
const archivedShownCount = ref(0);
/** 归档中可展示的消息（剔除旧 history-summary） */
const archivableMessages = computed<ConsultMessage[]>(() =>
  (currentSession.value?.archivedMessages ?? []).filter(
    (m) => m.kind === "user-question" || m.kind === "assistant-answer",
  ),
);
const displayedArchived = computed<ConsultMessage[]>(() => {
  const all = archivableMessages.value;
  if (archivedShownCount.value <= 0) return [];
  return all.slice(Math.max(0, all.length - archivedShownCount.value));
});
const hasMoreArchived = computed(
  () => archivedShownCount.value < archivableMessages.value.length,
);
const loadMoreArchived = () => {
  archivedShownCount.value += ARCHIVE_PAGE_SIZE;
};
// 切换会话时重置展开计数
watch(currentSessionId, () => {
  archivedShownCount.value = 0;
});

/** 发送按钮可用条件：有文字；若挂起了简历也必须有文字（必须和提问一起发） */
const canSend = computed(
  () => inputText.value.trim().length > 0 && !isStreaming.value,
);

/** 渲染 Markdown（缓存避免重复计算） */
const renderCache = new Map<string, string>();
const renderMarkdown = (md: string): string => {
  const cached = renderCache.get(md);
  if (cached !== undefined) return cached;
  const html = sanitizeHtml(markdownToHtml(md));
  renderCache.set(md, html);
  return html;
};

const resumeTitle = (id: string): string => {
  const r = resumeList.value.find((x) => x.id === id);
  return r?.title || "未命名简历";
};

const attachedResumeLabels = (msg: ConsultMessage): string => {
  if (!msg.attachedResumeIds?.length) return "已移除的简历";
  return msg.attachedResumeIds.map(resumeTitle).join("、");
};

// ========== 自动滚动到底部 ==========
const scrollToBottom = () => {
  nextTick(() => {
    const el = messagesRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
};

watch(() => currentMessages.value.length, scrollToBottom);
watch(streamingText, scrollToBottom);

// ========== 事件 ==========
const handleShowChange = (v: boolean) => {
  if (!v) clearPending();
  if (pinned.value) {
    // 常驻态：关闭=收起主体，但保持 pinned；同步给父组件以显隐 FAB
    bodyVisible.value = v;
  }
  emit("update:show", v);
};

const onNewSession = () => {
  if (isStreaming.value) return;
  clearPending();
  createSession();
  inputText.value = "";
  renderCache.clear();
};

const onSwitchSession = (id: string) => {
  // 正在编辑此 chip 时，click 不触发切换（避免编辑中误切）
  if (editingId.value === id) return;
  if (isStreaming.value) return;
  switchSession(id);
  inputText.value = "";
  renderCache.clear();
};

// 历史会话下拉：选择后切换并自动关闭下拉
const onPickHistory = (id: string) => {
  onSwitchSession(id);
  historyPopoverShow.value = false;
};

// 历史会话下拉：恢复已关闭会话并切换、收起下拉
const onReopenSession = (id: string) => {
  reopenSession(id);
  inputText.value = "";
  renderCache.clear();
  historyPopoverShow.value = false;
};

// 历史会话下拉：彻底删除（已关闭会话的 ×）
const onRemoveSession = async (id: string) => {
  await removeSession(id);
  renderCache.clear();
};

// ========== 会话重命名 ==========
const startRename = (id: string, title: string) => {
  // 流式中禁止进入编辑态（chip 已 is-disabled，双击不会触发，此处显式守卫）
  if (isStreaming.value) return;
  editingId.value = id;
  editingTitle.value = title || "新会话";
};

const commitRename = async () => {
  const id = editingId.value;
  if (id === null) return;
  const trimmed = editingTitle.value.trim();
  // 先清编辑态，避免 blur 二次进入
  editingId.value = null;
  editingTitle.value = "";
  // 流式中提交：提示并取消，不调 store（renameSession 内 isStreaming 守卫会静默 return）
  if (isStreaming.value) {
    naiveMessage.warning("流式中无法重命名，请稍后重试");
    return;
  }
  // 空标题保留原标题：不调用 renameSession
  if (trimmed) {
    await renameSession(id, trimmed);
  }
};

const cancelRename = () => {
  editingId.value = null;
  editingTitle.value = "";
};

const onDeleteSession = async (id: string) => {
  if (isStreaming.value && id === currentSessionId.value) return;
  await deleteSession(id);
  renderCache.clear();
};

const onSend = async () => {
  if (!canSend.value) return;
  const text = inputText.value;
  inputText.value = "";
  await sendMessage(text);
};

const onAbort = () => {
  abort();
};

// 抽屉打开时，若无打开的会话（标签栏空）且非流式中，则自动新建一个
// 常驻态下 props.show 变化也经此同步 bodyVisible（点 FAB 展开/收起主体）
watch(
  () => props.show,
  (v) => {
    if (pinned.value) bodyVisible.value = v;
    if (v && openTabs.value.length === 0 && !isStreaming.value) {
      createSession();
    }
  },
);
</script>

<style scoped lang="scss">
.consult-drawer {
  :deep(.n-drawer-header) {
    padding: 12px 16px;
  }
  // ponytail: body 左右 padding 移到各子区域自己控制，让 consult-tabs 标签栏天然通栏贴边
  :deep(.n-drawer-body-content-wrapper) {
    padding: 0 0 12px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  // 抽屉右上角自带关闭按钮：hover 图标+背景变红
  // 直接覆盖 NBaseClose 内部元素颜色，避开 Naive CSS 变量优先级问题
  :deep(.n-drawer-header__close) {
    &:hover {
      color: $error-color;
      background: rgba($error-color, 0.18);

      .n-base-icon {
        color: $error-color;
      }
    }
  }
}

.consult-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  &__pin {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    color: var(--n-text-color-3, #999);
    &:hover {
      background: var(--n-color-hover, rgba(0, 0, 0, 0.08));
      color: var(--n-text-color-2, #555);
    }
    &.is-active {
      color: var(--primary-color, #18a058);
    }
  }
  &__placement {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    color: var(--n-text-color-3, #999);
    &:hover {
      background: var(--n-color-hover, rgba(0, 0, 0, 0.08));
      color: var(--n-text-color-2, #555);
    }
  }
  &__history {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    color: var(--n-text-color-2, #555);
    &:hover {
      background: rgba(208, 48, 80, 0.1);
      color: var(--n-error-color, #d03050);
    }
  }
  &__new {
    /* margin-left:auto 由 history 接管，此处不再需要 */
  }
}

.consult-tabs {
  // 标签栏底部隔离线
  border-bottom: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.12));
  display: flex;
  align-items: flex-end;
  gap: 2px;
  &__list {
    display: flex;
    gap: 2px;
    overflow-x: auto;
    flex: 1;
    &::-webkit-scrollbar {
      height: 4px;
    }
  }
  &__tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    width: 150px;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    border-radius: 6px 6px 0 0;
    border: 1px solid transparent;
    border-bottom: none;
    background: var(--n-color-target, rgba(0, 0, 0, 0.04));
    color: var(--n-text-color-2, #555);
    margin-bottom: -1px;
    &:hover {
      background: var(--n-color-hover, rgba(0, 0, 0, 0.08));
    }
    &.is-active {
      // 暗色（默认 :root）下选中态：顶部主题色高亮线 + 提亮背景，
      // 拉开与未选中 tab（--n-color-target）的对比度
      background: var(--bg-secondary, #252527);
      color: var(--primary-color, #18a058);
      border-color: var(--border-color, rgba(255, 255, 255, 0.1));
      border-top: 2px solid var(--primary-color, #18a058);
      // 浅色下：保持 VS Code 风格（白底融合），但顶部加绿色高亮线，与暗色系一致
      // 注意：不能用 :global([data-theme="light"]) & ——scoped 下 & 会丢失父选择器，
      // 编译成裸 [data-theme="light"]{} 全局规则污染全页。用祖先后代组合才安全。
      [data-theme="light"] & {
        background: var(--n-color, #fff);
        color: var(--n-text-color, #333);
        border-color: var(--n-border-color, rgba(0, 0, 0, 0.12));
        border-top: 2px solid var(--primary-color, #18a058);
      }
    }
    &.is-disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    &.is-editing {
      cursor: default;
    }
  }
  &__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }
  &__edit {
    flex: 1;
    min-width: 0;
  }
  &__del {
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
    border-radius: 3px;
    padding: 1px;
    &:hover {
      opacity: 1;
      color: var(--n-error-color, #d03050);
      background: rgba(208, 48, 80, 0.1);
    }
  }
  &__tab:hover &__del {
    opacity: 0.6;
  }
}

.consult-session-list {
  max-height: 320px;
  overflow-y: auto;
  &__header {
    font-size: 12px;
    font-weight: 600;
    color: var(--n-text-color-3, #999);
    padding: 4px 10px 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  &__limit {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.8;
  }
  &__empty {
    font-size: 13px;
    color: var(--n-text-color-3, #999);
    padding: 16px 10px;
    text-align: center;
  }
  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--n-text-color-2, #555);
    font-size: 13px;
    &:hover {
      background: var(--n-color-hover, rgba(0, 0, 0, 0.06));
    }
    &.is-active {
      color: var(--primary-color, #18a058);
      background: var(--primary-color-hover, rgba(24, 160, 88, 0.08));
    }
    &.is-disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    &.is-editing {
      cursor: default;
      background: var(--n-color-hover, rgba(0, 0, 0, 0.06));
    }
    &.is-closed {
      opacity: 0.7;
    }
  }
  &__icon {
    flex-shrink: 0;
  }
  &__title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: none;
  }
  &__time {
    font-size: 11px;
    opacity: 0.6;
    flex-shrink: 0;
  }
  &__closed {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--n-color-target, rgba(0, 0, 0, 0.08));
    color: var(--n-text-color-3, #999);
    flex-shrink: 0;
  }
  &__edit {
    width: 100%;
  }
  &__del {
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
    border-radius: 3px;
    padding: 1px;
    &:hover {
      opacity: 1 !important;
      color: var(--n-error-color, #d03050);
      background: rgba(208, 48, 80, 0.1);
    }
  }
  &__item:hover &__del {
    opacity: 0.6;
  }
}

.consult-messages {
  // 内容区背景与活动 tab 一致，实现"相通"
  background: var(--n-color, transparent);
  flex: 1;
  overflow-y: auto;
  padding: 6px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}

.consult-empty {
  margin: auto;
  text-align: center;
  color: var(--n-text-color-3, #999);
  p {
    margin: 8px 0 0;
    font-size: 14px;
  }
  &__hint {
    font-size: 12px;
    opacity: 0.7;
  }
  &--noai .n-button {
    margin-top: 12px;
  }
}

// ========== 隐私提示（安全绿，颜色由 privacy-notice mixin 统一提供） ==========
.consult-privacy-notice {
  @include privacy-notice;
  margin: 16px auto 0;
  max-width: 92%;
}

.consult-ctx {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--n-text-color-3, #999);
  padding: 4px 10px;
  border-radius: 10px;
  background: var(--n-color-target, rgba(0, 0, 0, 0.04));
  &--notice {
    font-size: 11px;
    opacity: 0.85;
  }
}

// 归档气泡：降低透明度区分早期对话
.consult-bubble--archived {
  opacity: 0.62;
}
.consult-arch-more {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--n-text-color-3, #999);
  padding: 4px 12px;
  border: none;
  border-radius: 10px;
  background: var(--n-color-target, rgba(0, 0, 0, 0.04));
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.75;
    color: var(--n-text-color-2, #666);
  }
}
.consult-arch-divider {
  margin-top: 4px;
}

.consult-bubble {
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  &--user {
    align-self: flex-end;
    background: var(--primary-color, #18a058);
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  &--ai {
    align-self: flex-start;
    background: var(--n-color-target, rgba(0, 0, 0, 0.05));
    border-bottom-left-radius: 4px;
    :deep(p) {
      margin: 0 0 8px;
      &:last-child {
        margin: 0;
      }
    }
    :deep(ul),
    :deep(ol) {
      margin: 0 0 8px;
      padding-left: 20px;
    }
    :deep(code) {
      background: rgba(0, 0, 0, 0.1);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 12px;
    }
    :deep(pre) {
      background: rgba(0, 0, 0, 0.08);
      padding: 8px;
      border-radius: 6px;
      overflow-x: auto;
    }
  }
  &--streaming {
    min-height: 36px;
  }
  &__placeholder {
    color: var(--n-text-color-3, #999);
  }
  &__cursor {
    animation: consult-blink 1s steps(2) infinite;
  }
}

@keyframes consult-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.consult-resume-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 16px;
  border-top: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.09));
  // n-upload 内联，避免撑满导致 + 按钮换行到上方
  :deep(.n-upload) {
    display: inline-flex !important;
    width: auto !important;
  }
  :deep(.n-upload-trigger) {
    display: inline-flex !important;
  }
  &__count {
    margin-left: 4px;
    background: var(--primary-color, #18a058);
    color: #fff;
    border-radius: 8px;
    padding: 0 6px;
    font-size: 11px;
  }
  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--n-color-target, rgba(0, 0, 0, 0.06));
    max-width: 140px;
    overflow: hidden;
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :deep(svg) {
      cursor: pointer;
      flex-shrink: 0;
    }
    :deep(svg:last-child) {
      border-radius: 3px;
      padding: 1px;
      &:hover {
        color: var(--n-error-color, #d03050);
        background: rgba(208, 48, 80, 0.1);
      }
    }
  }
  &__chip--file {
    max-width: 180px;
  }
  &__filename {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.consult-resume-pop {
  &__title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  &__empty {
    font-size: 13px;
    color: var(--n-text-color-3, #999);
    padding: 12px 0;
    text-align: center;
  }
  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    cursor: pointer;
    border-radius: 6px;
    &:hover {
      background: var(--n-color-target, rgba(0, 0, 0, 0.04));
    }
    &.is-checked {
      color: var(--primary-color, #18a058);
    }
  }
  &__name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }
  &__cur {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--primary-color, #18a058);
    color: #fff;
  }
  &__hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--n-text-color-3, #999);
  }
}

.consult-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 16px 0;
  border-top: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.09));
}
</style>

<!-- 拖拽条 teleport 到 body，scoped 带不上 data 属性，用 :global -->
<style lang="scss">
.consult-pin-resize {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 2001; // 高于 n-drawer 默认层
  &:hover {
    background: rgba($primary-color, 0.4);
  }
  &:active {
    background: $primary-color;
  }
}
</style>
