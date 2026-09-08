import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/TeamUp/',
  plugins: [react()],
  test: {
    exclude: ['server/**', 'node_modules/**', 'dist/**'],
  },
})
