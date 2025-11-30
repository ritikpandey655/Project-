
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
        injectRegister: 'auto', // Changed to auto to ensure PWA Builder detects the SW in index.html
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'offline.html', 'icon.svg'],
        manifest: {
          name: 'PYQverse: AI Exam Prep',
          short_name: 'PYQverse',
          description: 'Master UPSC, SSC, JEE, NEET & more with AI-powered Previous Year Questions, smart analytics, and unlimited practice.',
          theme_color: '#f97316',
          background_color: '#111827',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          id: '/',
          categories: ["education", "productivity", "study"],
          lang: "en",
          dir: "ltr",
          prefer_related_applications: false,
          iarc_rating_id: "e84b072d-71b3-4d3e-86ae-31a8ce02a73d",
          related_applications: [
            {
              platform: "play",
              url: "https://play.google.com/store/apps/details?id=com.pyqverse.app",
              id: "com.pyqverse.app"
            }
          ],
          // Ensure 'tabbed' and 'window-controls-overlay' are explicitly defined
          display_override: ["window-controls-overlay", "tabbed", "minimal-ui", "standalone", "browser"],
          // Define scope extensions for associated domains
          scope_extensions: [
            {
              origin: "https://pyqverse.vercel.app"
            },
            {
              origin: "https://pyqverse.web.app"
            }
          ],
          launch_handler: {
            client_mode: ["navigate-existing", "auto"]
          },
          protocol_handlers: [
            {
              protocol: "web+pyq",
              url: "/?action=practice&q=%s"
            }
          ],
          share_target: {
            action: "/?action=upload",
            method: "GET",
            enctype: "application/x-www-form-urlencoded",
            params: {
              title: "title",
              text: "text",
              url: "url"
            }
          },
          file_handlers: [
            {
              action: "/?action=import",
              accept: {
                "application/json": [".json", ".pyq"],
                "text/csv": [".csv"]
              },
              icons: [
                {
                  src: "/icon.svg",
                  sizes: "512x512",
                  type: "image/svg+xml"
                }
              ],
              launch_type: "single-client"
            }
          ],
          edge_side_panel: {
             preferred_width: 480
          },
          note_taking: {
            new_note_url: "/?action=upload"
          },
          icons: [
            {
              src: "/icon.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: "/icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: "/icon.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "maskable"
            },
            {
              src: "/icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
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
              icons: [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }]
            },
            {
              name: "Doubt Solver",
              short_name: "Doubts",
              url: "/?action=upload",
              icons: [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }]
            }
          ],
          widgets: [
            {
                name: "Question of the Day",
                short_name: "QOTD",
                description: "Daily exam practice question",
                icons: [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
                screenshots: [{ src: "https://placehold.co/400x400/5B2EFF/ffffff.png?text=QOTD", sizes: "400x400", type: "image/png", label: "Widget Preview" }],
                tag: "qotd",
                template: "widget-template.json",
                ms_ac_template: "widget-template.json",
                data: "widget-data.json",
                type: "application/json"
            }
          ]
        } as any,
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
                  maxAgeSeconds: 60 * 60 * 24 * 365
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
