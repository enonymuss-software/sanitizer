import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use './' to ensure assets load correctly regardless of your repo name
  base: './', 
  build: {
    // SECURITY: Disabling sourcemaps makes it harder for others to 
    // reverse-engineer your exact source code logic in the browser.
    sourcemap: false,
    // Ensure the output directory matches what our GitHub Action expects
    outDir: 'dist',
  },
})
