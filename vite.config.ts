import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { apiDevPlugin } from './src/dev/apiProxy';

export default defineConfig({
  plugins: [
    react(),
    apiDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: false, // using public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Prevent the service worker from intercepting cross-origin requests
        // (e.g. YouTube thumbnail images) with the navigation fallback.
        navigateFallbackDenylist: [/^\/api/, /^https?:\/\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'youtube-thumbnails',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
});
