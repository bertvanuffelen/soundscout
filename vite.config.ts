import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Multi-page: /teacher krijgt een eigen HTML met docent-specifieke
      // SEO-meta (title/description/JSON-LD); beide laden dezelfde app.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        teacher: fileURLToPath(new URL('./teacher.html', import.meta.url)),
      },
      output: {
        manualChunks: {
          'tone': ['tone'],
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'audio-export': ['@breezystack/lamejs'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
