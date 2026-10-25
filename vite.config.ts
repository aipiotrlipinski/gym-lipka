import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Aplikacja jest publikowana pod adresem https://aipiotrlipinski.github.io/gym-lipka/
export default defineConfig({
  base: '/gym-lipka/',
  define: {
    __APP_VERSION__: JSON.stringify(`0.2.0 (${new Date().toISOString().slice(0, 10)})`),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Gym Lipka',
        short_name: 'Gym Lipka',
        description: 'Szybki, darmowy i prywatny dziennik treningowy',
        lang: 'pl',
        start_url: '/gym-lipka/',
        scope: '/gym-lipka/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F5F1',
        theme_color: '#F6F5F1',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
})
