import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), cloudflare()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})