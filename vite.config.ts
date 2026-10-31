import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Dev keeps every request same-origin (`/api/*`), so the shared session
  // cookie and the tenant header behave exactly as they do in production.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5091'
  const proxy = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
  }

  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      proxy,
    },
    // `vite preview` serves the production bundle, so it needs the same proxy
    // for a local end-to-end check against a real API.
    preview: {
      port: 4173,
      proxy,
    },
  }
})

