import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Совпадает с paths."@/*" в tsconfig.json
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: './', // Делает пути относительными для корректной работы на GitHub Pages
})