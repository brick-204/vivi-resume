import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import viteCompression from 'vite-plugin-compression'

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
  }
})