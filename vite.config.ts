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
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'PYQverse',
          short_name: 'PYQverse',
          description: 'AI-powered Previous Year Questions for UPSC, SSC, JEE, NEET & more.',
          theme_color: '#5B2EFF',
          background_color: '#111827',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
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
          shortcuts: [
            {
              name: "Start Practice",
              short_name: "Practice",
              url: "/?action=practice",
              icons: [
                {
                  src: "https://res.cloudinary.com/dwxqyvz5j/image/fetch/w_192,h_192,c_fill,q_auto,f_png/https://api.dicebear.com/9.x/initials/png?seed=PV&backgroundColor=5B2EFF&backgroundType=gradientLinear&scale=120",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "any"
                }
              ]
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
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