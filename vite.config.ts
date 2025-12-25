
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import * as path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, // We handle SW registration manually in index.html
        filename: 'sw.js', // Match the filename used in the project root
        manifest: false, // Strictly use public/manifest.json
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'offline.html', 'icon.svg', 'widget-template.json', 'widget-data.json', 'robots.txt'],
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,txt}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/auth/, /^\/api/, /^\/docs/, /^\/openapi.json/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } }
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: { cacheName: 'images-cache', expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 } },
            }
          ]
        }
      })
    ],
    resolve: {
      alias: { '@': path.resolve('.') },
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1600,
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""), 
      'process.env.GROQ_API_KEY': JSON.stringify(env.GROQ_API_KEY || ""),
      'process.env.PHONEPE_MERCHANT_ID': JSON.stringify(env.PHONEPE_MERCHANT_ID),
    },
  };
});
