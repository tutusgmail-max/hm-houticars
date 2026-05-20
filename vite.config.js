import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite v8 (Rolldown) expects `output.manualChunks` to be a FUNCTION.
// The previous object-form config works in Rollup but throws at build time with Rolldown:
// "Invalid type: Expected Function but received Object" → "TypeError: manualChunks is not a function".
// We keep the same vendor splitting intent via a function that maps module IDs to chunk names.
const VENDOR_CHUNKS = {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-ui': ['framer-motion', 'lucide-react', 'react-icons'],
  'vendor-pdf': ['jspdf'],
}

function manualChunks(id) {
  if (!id || !id.includes('node_modules')) return

  // Normalize path separators just in case (Windows)
  const normalized = id.replace(/\\/g, '/')

  for (const [chunkName, packages] of Object.entries(VENDOR_CHUNKS)) {
    for (const pkg of packages) {
      // Handles both regular and scoped packages (e.g. @supabase/supabase-js)
      if (normalized.includes(`/node_modules/${pkg}/`)) return chunkName
    }
  }
}

export default defineConfig({
  plugins: [react()],

  build: {
    // FIX : chunk splitting pour Vercel (évite bundle > 500KB)
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    // Warn si chunk > 600KB
    chunkSizeWarningLimit: 600,
    // Minification avancée
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: false,
  },

  // FIX : optimisation dépendances pour éviter page blanche en dev
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'framer-motion',
      'lucide-react',
    ],
  },

  // Résolution path aliases (optionnel mais pratique)
  resolve: {
    alias: {},
  },

  // Serveur dev
  server: {
    port: 5173,
    strictPort: false,
  },
})
