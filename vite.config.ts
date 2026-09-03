import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  // affiche la date du build dans l'aide: sans barre d'adresse, c'est le seul
  // moyen de savoir sur quelle version on tourne
  define: {
    __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  plugins: [
    react(),
    VitePWA({
      // ARTIFACT=1 : sortie en page unique, sans service worker
      disable: !!process.env.ARTIFACT,
      // 'prompt' et pas 'autoUpdate': le script injecte par autoUpdate se
      // contente d'enregistrer le service worker, il n'ecoute jamais les
      // mises a jour. En mode application, sans barre d'adresse pour
      // recharger, l'app ne pouvait donc jamais se mettre a jour. On gere
      // l'enregistrement nous-memes dans App.tsx.
      registerType: 'prompt',
      injectRegister: null,
      // le nouveau service worker prend la main des qu il est active, sinon
      // rien ne previent la page qu elle doit se recharger
      workbox: { clientsClaim: true },
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
