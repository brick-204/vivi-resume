import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 布局配置常量
const LAYOUT_CONFIG = {
  // 最小宽度
  MIN_NAV_WIDTH: 48,        // 收缩后的图标列宽度
  MIN_NAV_EXPANDED: 160,    // 展开后的最小宽度
  MIN_EDITOR_WIDTH: 300,    // 编辑区最小宽度
  MAX_NAV_WIDTH: 280,       // 导航栏最大宽度
  MAX_EDITOR_WIDTH: 600,    // 编辑区最大宽度
  MIN_PREVIEW_WIDTH: 400,   // 预览区最小宽度

  // 默认宽度
  DEFAULT_NAV_WIDTH: 200,   // 导航栏默认宽度
  DEFAULT_EDITOR_WIDTH: 420,// 编辑区默认宽度

  // 本地存储键
  STORAGE_KEY: 'vivi-editor-layout',
  STORAGE_VERSION: 1        // 版本号，用于数据迁移
}

export const useEditorLayoutStore = defineStore('editorLayout', () => {
  // ========== 状态 ==========

  // 第一列（导航栏）宽度
  const navWidth = ref(LAYOUT_CONFIG.DEFAULT_NAV_WIDTH)

  // 第二列（编辑区）宽度
  const editorWidth = ref(LAYOUT_CONFIG.DEFAULT_EDITOR_WIDTH)

  // 第一列是否收缩（只显示图标）
  const navCollapsed = ref(false)

  // 第二列是否收缩（完全隐藏）
  const editorCollapsed = ref(false)

  // 当前选中的模块 ID
  const activeSectionId = ref('basic')

  // ========== 计算属性 ==========

  // 第一列实际渲染宽度
  const actualNavWidth = computed(() => {
    return navCollapsed.value ? LAYOUT_CONFIG.MIN_NAV_WIDTH : navWidth.value
  })

  // 第二列实际渲染宽度
  const actualEditorWidth = computed(() => {
    return editorCollapsed.value ? 0 : editorWidth.value
  })

  // ========== 方法 ==========

  // 设置导航栏宽度（带边界约束）
  const setNavWidth = (width: number) => {
    navWidth.value = Math.max(
      LAYOUT_CONFIG.MIN_NAV_EXPANDED,
      Math.min(LAYOUT_CONFIG.MAX_NAV_WIDTH, width)
    )
  }

  // 设置编辑区宽度（带边界约束）
  const setEditorWidth = (width: number) => {
    editorWidth.value = Math.max(
      LAYOUT_CONFIG.MIN_EDITOR_WIDTH,
      Math.min(LAYOUT_CONFIG.MAX_EDITOR_WIDTH, width)
    )
  }

  // 切换导航栏收缩状态
  const toggleNavCollapse = () => {
    navCollapsed.value = !navCollapsed.value
    saveLayout()
  }

  // 切换编辑区收缩状态
  const toggleEditorCollapse = () => {
    editorCollapsed.value = !editorCollapsed.value
    saveLayout()
  }

  // 展开编辑区（收缩状态下点击导航项时调用）
  const expandEditor = () => {
    if (editorCollapsed.value) {
      editorCollapsed.value = false
      saveLayout()
    }
  }

  // 设置当前选中模块
  const setActiveSection = (sectionId: string) => {
    activeSectionId.value = sectionId
  }

  // 保存布局到本地存储
  const saveLayout = () => {
    const data = {
      version: LAYOUT_CONFIG.STORAGE_VERSION,
      navWidth: navWidth.value,
      editorWidth: editorWidth.value,
      navCollapsed: navCollapsed.value,
      editorCollapsed: editorCollapsed.value
    }
    localStorage.setItem(LAYOUT_CONFIG.STORAGE_KEY, JSON.stringify(data))
  }

  // 从本地存储加载布局
  const loadLayout = () => {
    const saved = localStorage.getItem(LAYOUT_CONFIG.STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        // 版本检查：如果版本不匹配，使用默认值
        if (data.version !== LAYOUT_CONFIG.STORAGE_VERSION) {
          console.log('Layout storage version mismatch, using defaults')
          return
        }
        navWidth.value = data.navWidth ?? LAYOUT_CONFIG.DEFAULT_NAV_WIDTH
        editorWidth.value = data.editorWidth ?? LAYOUT_CONFIG.DEFAULT_EDITOR_WIDTH
        navCollapsed.value = data.navCollapsed ?? false
        editorCollapsed.value = data.editorCollapsed ?? false
      } catch (e) {
        console.error('Failed to load layout:', e)
      }
    }
  }

  // 窗口 resize 处理：确保预览区有足够空间
  const handleWindowResize = () => {
    const availableWidth = window.innerWidth
    const currentUsed = actualNavWidth.value + actualEditorWidth.value
    const minPreview = LAYOUT_CONFIG.MIN_PREVIEW_WIDTH

    // 如果空间不足，优先缩小编辑区
    if (currentUsed + minPreview > availableWidth) {
      const overflow = currentUsed + minPreview - availableWidth
      const newEditorWidth = editorWidth.value - overflow
      if (newEditorWidth >= LAYOUT_CONFIG.MIN_EDITOR_WIDTH) {
        editorWidth.value = newEditorWidth
      } else {
        // 如果编辑区已经最小，尝试缩小导航栏
        editorWidth.value = LAYOUT_CONFIG.MIN_EDITOR_WIDTH
        const remainingOverflow = overflow - (editorWidth.value - newEditorWidth)
        const newNavWidth = navWidth.value - remainingOverflow
        navWidth.value = Math.max(LAYOUT_CONFIG.MIN_NAV_EXPANDED, newNavWidth)
      }
    }
  }

  // 初始化加载
  loadLayout()

  // 监听窗口 resize
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleWindowResize)
  }

  return {
    // 状态
    navWidth,
    editorWidth,
    navCollapsed,
    editorCollapsed,
    activeSectionId,

    // 计算属性
    actualNavWidth,
    actualEditorWidth,

    // 方法
    setNavWidth,
    setEditorWidth,
    toggleNavCollapse,
    toggleEditorCollapse,
    expandEditor,
    setActiveSection,
    saveLayout,
    loadLayout,
    handleWindowResize,

    // 常量（暴露给组件使用）
    config: LAYOUT_CONFIG
  }
})
