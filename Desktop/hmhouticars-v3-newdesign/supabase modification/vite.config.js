import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':    ['react', 'react-dom'],
          'router':          ['react-router-dom'],
          'supabase':        ['@supabase/supabase-js'],
          'motion':          ['framer-motion'],
          'icons':           ['lucide-react', 'react-icons'],
          'pdf':             ['jspdf'],
        },
      },
    },
  },

  // Remove accidental console.log leaks from production build
  esbuild: {
    drop: ['debugger'],
    // keep console in dev, strip only in prod via define below
  },

  define: {
    // expose build mode so we can guard console.log at runtime
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
})
