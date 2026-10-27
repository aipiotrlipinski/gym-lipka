import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Wersja przeglądarkowa: https://aipiotrlipinski.github.io/gym-lipka/
// Wersja APK (`vite build --mode apk`): pliki ładowane z telefonu, bez service workera — Capacitor sam działa offline.
export default defineConfig(({ mode }) => ({
  base: mode === 'apk' ? './' : '/gym-lipka/',
  define: {
    __APP_VERSION__: JSON.stringify(`0.5.0 (${new Date().toISOString().slice(0, 10)})`),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: mode === 'apk',
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
        // Przytrzymaj ikonę aplikacji na ekranie głównym → te skróty. Każdy można przeciągnąć na pulpit jako osobną ikonę.
        shortcuts: [
          {
            name: 'Zacznij trening',
            short_name: 'Trening',
            description: 'Wznów trwający albo zacznij następny dzień planu',
            url: '/gym-lipka/#/szybki-start',
            icons: [{ src: 'shortcut-start.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Historia',
            url: '/gym-lipka/#/historia',
            icons: [{ src: 'shortcut-historia.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Ćwiczenia',
            url: '/gym-lipka/#/cwiczenia',
            icons: [{ src: 'shortcut-cwiczenia.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,webp}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
}))
