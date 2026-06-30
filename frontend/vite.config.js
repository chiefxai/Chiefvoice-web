import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/dashboard/",
  plugins: [react()],
  build: {
    outDir: '../dashboard',
    emptyOutDir: true,
  }
})
