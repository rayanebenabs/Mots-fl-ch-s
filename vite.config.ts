import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg'],
      manifest: {
        name: 'Mots Fléchés — Pop & Actu',
        short_name: 'Mots Fléchés',
        description: 'Des mots fléchés nerveux, bourrés de pop culture et d’actu.',
        lang: 'fr',
        start_url: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d0b14',
        theme_color: '#0d0b14',
        icons: [
          { src: './icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: './icone-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
