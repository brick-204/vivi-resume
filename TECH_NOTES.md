# 技术要点与矛盾点笔记

记录项目中一些非显而易见的技术决策、权衡与已知矛盾点。新条目追加在末尾。

---

## 桌宠回收站：异步落盘与写盘竞态

### 背景

桌宠回收站已从「单 meta key 存整个数组」重构为「每条独立存储」（目录模式 `trash-pets/{id}.json` / IndexedDB `trashPets` store），单条增删为 O(1)。但单个自定义桌宠的 lottie JSON 可达数 MB，`toPlain`（`structuredClone(toRaw(x))`）对它的同步克隆仍会阻塞主线程几十~几百毫秒。

为提高 INP（交互响应），`settingsStore` 的回收站 action（`removeCustomPet`/`restorePet`/`purgePet`/`emptyTrashPets`）采用 **先更新内存响应式状态、持久化 fire-and-forget** 的策略，对齐 `resumeStore.restoreResume` 的现有做法。弹窗不等写盘完成即关闭，UI 立即反映列表变化。

### 矛盾点：同一 pet 的「删→恢复」写盘竞态

fire-and-forget 下，两条针对**同一 id** 的写盘操作不保证顺序。以「删 A 后马上恢复 A」为例：

- 删 A 写 `trash-pets/A.json` + 删 `desktop-pets/A.json`
- 恢复 A 写 `desktop-pets/A.json` + 删 `trash-pets/A.json`

若恢复 A 的 `deleteDesktopPet(A)` 后于删 A 的 `deleteDesktopPet(A)` 完成，会把恢复时刚写入的 `desktop-pets/A.json` 删掉 → A 在存储中丢失（内存已正确，但重载后丢失）。

**现状选择：不加队列，接受理论竞态。** 理由：
- 触发需用户在秒级内对同一 pet 先删后恢复，实际操作间隔远大于写盘耗时。
- 与 `resumeStore` 的 fire-and-forget 策略一致，写盘失败仅 `console.error` 不回滚。
- 回收站为临时存储，极端丢失可接受。

### 未采用的解法：per-id 写盘队列（备查）

若未来需要彻底消除竞态，可用 per-id 写盘队列串行化同一 pet 的存储操作：

```ts
// 伪代码：每个 id 一个 Promise 链，保证同 id 写盘按调用顺序执行
const writeQueues = new Map<string, Promise<void>>()

function enqueuePetWrite(id: string, task: () => Promise<void>): Promise<void> {
  const prev = writeQueues.get(id) ?? Promise.resolve()
  const next = prev.then(task, task) // 无论前一个成功失败都继续
  writeQueues.set(id, next)
  // 清理已 settled 的队列项避免内存增长
  next.finally(() => {
    if (writeQueues.get(id) === next) writeQueues.delete(id)
  })
  return next
}
```

`removeCustomPet`/`restorePet` 的持久化部分包进 `enqueuePetWrite(id, ...)`，保证同 id 的删/恢复写盘按内存顺序串行执行，不交错。代价：约 10 行 + 一个 Map；不同 id 仍并发，不影响整体吞吐。

全局写盘队列（不区分 id）更简单（一个 Promise 变量），但所有 pet 写盘串行，并发性差；回收站操作低频，也是可接受的退化方案。

### 相关文件

- `src/stores/settingsStore.ts` — `removeCustomPet`/`restorePet`/`purgePet`/`emptyTrashPets`（fire-and-forget 持久化）
- `src/utils/storage.ts` — `toPlain`（structuredClone 同步阻塞点）
- `src/components/dashboard/TrashPanel.vue` — 自定义 spin 按钮（n-modal + #action slot，spin 由 CSS 合成线程驱动，主线程阻塞期仍可转）
- `src/components/dashboard/SettingsPanel.vue` — 删除桌宠的 `removingPetId` spin 模式（TrashPanel spin 按钮的对齐参考）
