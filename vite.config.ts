import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api calls to the local backend — avoids CORS entirely in dev.
      // serverless-offline binds only to the IPv6 loopback (::1) on Windows, so
      // target it explicitly. Using "localhost" can resolve to IPv4 (127.0.0.1),
      // where nothing is listening — the proxy then falls through and serves
      // index.html (HTML), causing "Unexpected token '<' ... is not valid JSON".
      '/api': {
        target: 'http://[::1]:3000',
        changeOrigin: true,
      },
    },
  },
})
