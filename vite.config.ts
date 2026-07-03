/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import viteCompression from 'vite-plugin-compression'
import type { ProxyOptions } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    // 预压缩：生成 .gz 文件（Nginx/CDN 可直接传输，无需实时压缩）
    viteCompression({
      algorithm: 'gzip',
      threshold: 1024, // 仅压缩 >1KB 的文件
      deleteOriginFile: false, // 保留原文件，兼容不支持 gzip 的客户端
    }),
    // 预压缩：生成 .br 文件（Brotli，压缩率更高）
    viteCompression({
      algorithm: 'brotliCompress',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'naive-ui': ['naive-ui'],
          'tiptap': [
            '@tiptap/vue-3',
            '@tiptap/starter-kit',
            '@tiptap/extension-color',
            '@tiptap/extension-highlight',
            '@tiptap/extension-link',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-text-align',
            '@tiptap/extension-text-style',
            '@tiptap/extension-underline',
            '@tiptap/pm/view',
            '@tiptap/pm/state',
            '@tiptap/pm/model',
            '@tiptap/pm/transform',
            '@tiptap/pm/commands',
            '@tiptap/pm/keymap',
            '@tiptap/pm/schema-list',
            '@tiptap/pm/history',
            '@tiptap/pm/dropcursor',
            '@tiptap/pm/gapcursor',
            '@tiptap/pm/changeset',
            '@tiptap/pm/tables',
          ],
          'vuedraggable': ['vuedraggable'],
          'pdfjs': ['pdfjs-dist'],
          'mammoth': ['mammoth'],
          'docx': ['docx'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/variables" as *;\n@use "@/assets/styles/mixins" as *;\n`,
        api: 'modern-compiler'
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  server: {
    proxy: {
      // AI 服务代理 — 开发环境下解决 CORS 问题
      // 使用方式：在 AI 配置中将 endpoint 设为 /api/ai/openai 等
      // 注意：必须禁用 proxy 缓冲以支持 SSE 流式响应
      '/api/ai/openai': sseProxy('https://api.openai.com', '/api/ai/openai'),
      '/api/ai/zhipu': sseProxy('https://open.bigmodel.cn', '/api/ai/zhipu'),
      '/api/ai/qwen': sseProxy('https://dashscope.aliyuncs.com', '/api/ai/qwen'),
      '/api/ai/minimax': sseProxy('https://api.minimax.chat', '/api/ai/minimax'),
      '/api/ai/baichuan': sseProxy('https://api.baichuan-ai.com', '/api/ai/baichuan'),
      '/api/ai/yi': sseProxy('https://api.lingyiwanwu.com', '/api/ai/yi'),
    },
  },
})

/** 创建支持 SSE 流式响应的代理配置 */
function sseProxy(target: string, prefix: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    rewrite: (path) => path.replace(new RegExp(`^${prefix}`), ''),
    configure: (proxy) => {
      proxy.on('proxyRes', (proxyRes) => {
        // 禁用代理缓冲，让 SSE chunk 立即转发到浏览器
        proxyRes.headers['x-accel-buffering'] = 'no'
      })
    },
  }
}
