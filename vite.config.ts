import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), cloudflare()],
  server: {
    proxy: {
      '/milk_tea/api': 'http://localhost:3001',
    },
  },
})