<template>
  <div class="ai-demo ai-demo--consult">
    <!-- 抽屉头部模拟 -->
    <div class="consult-demo__header">
      <Icon icon="mdi:comment-question-outline" :width="16" />
      <span>AI 咨询</span>
      <span class="consult-demo__pin" title="常驻侧栏">
        <Icon icon="mdi:pin" :width="14" />
      </span>
    </div>

    <!-- 对话区 -->
    <div class="consult-demo__messages">
      <template v-for="(msg, idx) in visibleMessages" :key="idx">
        <!-- 简历上下文 chip -->
        <div v-if="msg.kind === 'ctx'" class="consult-demo__ctx">
          <Icon icon="mdi:file-document-outline" :width="13" />
          <span>已注入简历上下文（脱敏）</span>
        </div>
        <!-- 用户提问 -->
        <div v-else-if="msg.kind === 'user'" class="consult-demo__bubble consult-demo__bubble--user">
          {{ msg.text }}
        </div>
        <!-- AI 回复（流式逐字） -->
        <div v-else class="consult-demo__bubble consult-demo__bubble--ai">
          <span>{{ msg.text.slice(0, typedChars[idx]) }}</span>
          <span
            v-if="msg.text.length > typedChars[idx]"
            class="consult-demo__cursor"
            aria-hidden="true"
          >▌</span>
        </div>
      </template>
    </div>

    <!-- 输入区模拟 -->
    <div class="consult-demo__input">
      <Icon icon="mdi:file-document-multiple-outline" :width="16" class="consult-demo__input-icon" />
      <span class="consult-demo__input-text">{{ placeholder }}</span>
      <span class="consult-demo__send">
        <Icon icon="mdi:send" :width="16" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

type DemoMsg =
  | { kind: 'ctx' }
  | { kind: 'user'; text: string }
  | { kind: 'ai'; text: string }

// ponytail: 一段固定多轮对话，循环播放；流式用 slice 模拟逐字
const messages: DemoMsg[] = [
  { kind: 'ctx' },
  { kind: 'user', text: '我的项目经历写得够量化吗？' },
  {
    kind: 'ai',
    text: '建议补充具体数据：把「优化了性能」改为「首屏加载从 3.2s 降至 1.1s」，用 STAR 法则突出你的角色与结果，匹配度会更高。',
  },
]

const placeholders = ['输入问题，Enter 发送…', '问问 AI 怎么改简历…']

const visibleMessages = ref<DemoMsg[]>([])
const typedChars = ref<number[]>([])
const placeholder = ref(placeholders[0])

let isDisposed = false
let timer: ReturnType<typeof setTimeout> | null = null

const clearAll = () => {
  if (timer) clearTimeout(timer)
  timer = null
}

const run = () => {
  if (isDisposed) return
  visibleMessages.value = []
  typedChars.value = []
  placeholder.value = placeholders[Math.floor(Math.random() * placeholders.length)] ?? placeholders[0]

  let step = 0
  const totalSteps = messages.length

  const next = () => {
    if (isDisposed) return
    if (step >= totalSteps) {
      // 播完一轮，停顿后循环
      timer = setTimeout(run, 2600)
      return
    }
    const msg = messages[step]
    visibleMessages.value = [...visibleMessages.value, msg]

    if (msg.kind === 'ai') {
      // 逐字流式
      const aiIdx = visibleMessages.value.length - 1
      typedChars.value = [...typedChars.value, 0]
      let chars = 0
      const total = msg.text.length
      const typeStep = () => {
        if (isDisposed) return
        chars += Math.max(1, Math.floor(total / 28))
        if (chars >= total) {
          chars = total
          typedChars.value = typedChars.value.map((c, i) => (i === aiIdx ? total : c))
          step++
          timer = setTimeout(next, 700)
          return
        }
        typedChars.value = typedChars.value.map((c, i) => (i === aiIdx ? chars : c))
        timer = setTimeout(typeStep, 45)
      }
      typeStep()
    } else {
      typedChars.value = [...typedChars.value, 0]
      step++
      timer = setTimeout(next, 600)
    }
  }
  next()
}

onMounted(() => run())
onUnmounted(() => {
  isDisposed = true
  clearAll()
})
</script>

<style lang="scss" scoped>
.ai-demo--consult {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  min-height: 220px;
}

.consult-demo__header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-secondary;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;

  .consult-demo__pin {
    margin-left: auto;
    color: $primary-light;
    display: inline-flex;
  }
}

.consult-demo__messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-xs;
  min-height: 140px;
}

.consult-demo__ctx {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 11px;
  color: $text-secondary;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-full;
}

.consult-demo__bubble {
  max-width: 85%;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  line-height: 1.55;
  animation: consult-pop 0.35s ease;

  &--user {
    align-self: flex-end;
    background: rgba($primary-color, 0.12);
    color: $text-primary;
    border: 1px solid rgba($primary-color, 0.2);
    border-bottom-right-radius: $radius-sm;
  }

  &--ai {
    align-self: flex-start;
    background: $bg-glass;
    border: 1px solid $border-glass;
    color: $text-primary;
    border-bottom-left-radius: $radius-sm;
  }
}

.consult-demo__cursor {
  color: $primary-light;
  animation: consult-blink 1s step-end infinite;
}

.consult-demo__input {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $text-secondary;
}

.consult-demo__input-icon {
  color: $text-light;
}

.consult-demo__input-text {
  flex: 1;
}

.consult-demo__send {
  display: inline-flex;
  color: $primary-light;
}

@keyframes consult-pop {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes consult-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}
</style>
