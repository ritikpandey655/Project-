
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  const manifestConfig: any = {
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
    
    // Experimental/Modern PWA Features
    display_override: ["tabbed", "window-controls-overlay", "standalone", "minimal-ui", "browser"],
    
    edge_side_panel: {
      preferred_width: 400
    },

    note_taking: {
      new_note_url: "/?action=upload"
    },

    scope_extensions: [
      {
        origin: "https://pyqverse.vercel.app"
      },
      {
        origin: "https://pyqverse.in"
      },
      {
        origin: "https://www.pyqverse.in"
      }
    ],
    
    file_handlers: [
      {
        action: "/?action=open-file",
        accept: {
          "text/plain": [".txt", ".note"],
          "application/json": [".json"]
        }
      }
    ],

    widgets: [
      {
        name: "Question of the Day",
        short_name: "QOTD",
        description: "Daily exam question to keep your streak alive.",
        tag: "qotd",
        template: "widget-template.json",
        data: "widget-data.json",
        type: "application/json",
        screenshots: [],
        icons: [{ "src": "/icon.svg", "sizes": "512x512", "type": "image/svg+xml" }]
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
    shortcuts: [
      {
        name: "Start Practice",
        short_name: "Practice",
        url: "/?action=practice",
        icons: [{ src: "/icon.svg", sizes: "512x512", type: "image/png" }]
      },
      {
        name: "Doubt Solver",
        short_name: "Doubts",
        url: "/?action=upload",
        icons: [{ src: "/icon.svg", sizes: "512x512", type: "image/png" }]
      }
    ],
    icons: [
      {
        src: "/icon.svg",
        sizes: "48x48 72x72 96x96 128x128 256x256",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon.svg",
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
        src: "https://placehold.co/1920x1080/111827/ffffff.png?text=PYQverse+Desktop+Experience&font=roboto",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Desktop Dashboard"
      }
    ]
  };

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, // MANUAL REGISTRATION IN index.html for better scanner detection
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'offline.html', 'icon.svg', 'widget-template.json', 'widget-data.json', 'robots.txt'],
        manifest: manifestConfig, // Pass the 'any' typed object
        workbox: {
          importScripts: ['/custom-sw-logic.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,txt}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/auth/],
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
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.PHONEPE_MERCHANT_ID': JSON.stringify(env.PHONEPE_MERCHANT_ID),
    },
  };
});
