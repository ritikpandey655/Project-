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
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'offline.html'],
        manifest: {
          name: 'PYQverse: AI Exam Prep',
          short_name: 'PYQverse',
          description: 'Master UPSC, SSC, JEE, NEET & more with AI-powered Previous Year Questions, smart analytics, and unlimited practice.',
          theme_color: '#5B2EFF',
          background_color: '#111827',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          id: '/',
          categories: ["education", "productivity", "study"],
          lang: "en",
          dir: "ltr",
          launch_handler: {
            client_mode: "navigate-existing"
          },
          icons: [
            {
              src: "https://res.cloudinary.com/dwxqyvz5j/image/fetch/w_192,h_192,c_fill,q_auto,f_png/https://api.dicebear.com/9.x/initials/png?seed=PV&backgroundColor=5B2EFF&backgroundType=gradientLinear&scale=120",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "https://res.cloudinary.com/dwxqyvz5j/image/fetch/w_192,h_192,c_fill,q_auto,f_png/https://api.dicebear.com/9.x/initials/png?seed=PV&backgroundColor=5B2EFF&backgroundType=gradientLinear&scale=120",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: "https://res.cloudinary.com/dwxqyvz5j/image/fetch/w_512,h_512,c_fill,q_auto,f_png/https://api.dicebear.com/9.x/initials/png?seed=PV&backgroundColor=5B2EFF&backgroundType=gradientLinear&scale=120",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "https://res.cloudinary.com/dwxqyvz5j/image/fetch/w_512,h_512,c_fill,q_auto,f_png/https://api.dicebear.com/9.x/initials/png?seed=PV&backgroundColor=5B2EFF&backgroundType=gradientLinear&scale=120",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ],
          screenshots: [
            {
              src: "https://placehold.co/1080x1920/111827/ffffff.png?text=PYQverse+Mobile+Dashboard&font=roboto",
              sizes: "1080x1920",
              type: "image/png",
              form_factor: "narrow",
              label: "Mobile Dashboard"
            },
            {
              src: "https://placehold.co/1080x1920/1f2937/ffffff.png?text=AI+Question+Analysis&font=roboto",
              sizes: "1080x1920",
              type: "image/png",
              form_factor: "narrow",
              label: "Question Analysis"
            },
            {
              src: "https://placehold.co/1920x1080/111827/ffffff.png?text=PYQverse+Desktop+Experience&font=roboto",
              sizes: "1920x1080",
              type: "image/png",
              form_factor: "wide",
              label: "Desktop Dashboard"
            }
          ],
          shortcuts: [
            {
              name: "Start Practice",
              short_name: "Practice",
              url: "/?action=practice",
              icons: [{ src: "https://placehold.co/96x96/5B2EFF/ffffff.png?text=P", sizes: "96x96", type: "image/png" }]
            },
            {
              name: "Doubt Solver",
              short_name: "Doubts",
              url: "/?action=upload",
              icons: [{ src: "https://placehold.co/96x96/10B981/ffffff.png?text=D", sizes: "96x96", type: "image/png" }]
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/auth/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
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
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'assets-cache',
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
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});