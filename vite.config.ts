import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl' // 👈 新增引入

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    glsl() // 👈 新增插件配置
  ], 
})