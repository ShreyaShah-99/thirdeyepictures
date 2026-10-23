import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api calls server-side so the browser makes only same-origin
      // requests (no CORS preflight). This also dodges any corporate proxy / VPN
      // / antivirus on the browser's network path that rewrites OPTIONS preflight
      // responses (e.g. dropping PATCH from Access-Control-Allow-Methods).
      //
      // Default: forward to the deployed AWS backend — no local backend needed.
      '/api': {
        target: 'https://xfcgfugil4.execute-api.ap-south-1.amazonaws.com',
        changeOrigin: true,
      },

      // Alternative: run the local serverless-offline backend instead, then use
      // this target. serverless-offline binds only to the IPv6 loopback (::1) on
      // Windows, so target it explicitly — "localhost" can resolve to IPv4
      // (127.0.0.1) where nothing listens, and the proxy then serves index.html
      // (HTML), causing "Unexpected token '<' ... is not valid JSON".
      //   target: 'http://[::1]:3000',
    },
  },
})
