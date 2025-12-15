
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, // MANUAL REGISTRATION IN index.html
        filename: 'service-worker.js', // Standard name for better detection
        manifestFilename: 'manifest.json', // Will use existing public/manifest.json
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'offline.html', 'icon.svg', 'widget-template.json', 'widget-data.json', 'robots.txt'],
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // Increase limit to 10MB
          importScripts: ['/custom-sw-logic.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,txt}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/auth/, /^\/api/, /^\/docs/, /^\/openapi.json/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
              },
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:5000', // Reverted to Node.js Backend Port
                changeOrigin: true,
                secure: false,
            }
        }
    },
    define: {
      // Empty string for BACKEND_URL in dev means it uses the proxy above (localhost:5000)
      // On Vercel production, this env var will be set automatically or via Vercel dashboard
      'process.env.BACKEND_URL': JSON.stringify(process.env.NODE_ENV === 'production' ? "https://pyqverse.vercel.app" : ""), 
      
      // SECURITY FIX: Do not expose API_KEY to client bundle
      'process.env.API_KEY': JSON.stringify(""), 
      'process.env.GROQ_API_KEY': JSON.stringify(env.GROQ_API_KEY || ""),
      'process.env.PHONEPE_MERCHANT_ID': JSON.stringify(env.PHONEPE_MERCHANT_ID),
    },
  };
});
