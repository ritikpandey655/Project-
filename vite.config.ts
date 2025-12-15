
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import * as path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        filename: 'service-worker.js',
        manifestFilename: 'manifest.json',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'offline.html', 'icon.svg', 'widget-template.json', 'widget-data.json', 'robots.txt'],
        manifest: {
          name: "PYQverse: All exams ka pura universe",
          short_name: "PYQverse",
          description: "Master UPSC, SSC, JEE, NEET & more with AI-powered Previous Year Questions, smart analytics, and unlimited practice.",
          theme_color: "#f97316",
          background_color: "#111827",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          categories: ["education", "productivity", "study"],
          lang: "en",
          dir: "ltr",
          icons: [
            { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
            { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
            { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
            { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
          ],
          shortcuts: [
            { name: "Start Practice", short_name: "Practice", url: "/?action=practice", icons: [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }] },
            { name: "Doubt Solver", short_name: "Doubts", url: "/?action=upload", icons: [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }] }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          importScripts: ['/custom-sw-logic.js'],
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
      chunkSizeWarningLimit: 1600,
    },
    // Proxy for Local Python Development
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'process.env.BACKEND_URL': JSON.stringify(""), // Handled via Proxy
      'process.env.API_KEY': JSON.stringify("AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0"), 
      'process.env.GROQ_API_KEY': JSON.stringify(env.GROQ_API_KEY || ""),
      'process.env.PHONEPE_MERCHANT_ID': JSON.stringify(env.PHONEPE_MERCHANT_ID),
    },
  };
});
