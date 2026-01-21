
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve('.'), '');
  
  return {
    publicDir: 'public',
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: [
        'site-checker-36.preview.emergentagent.com',
        '.emergentagent.com',
        '.preview.emergentagent.com',
        'localhost',
      ],
      proxy: {
        '/api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react()
    ],
    resolve: {
      alias: { '@': path.resolve('.') },
    },
    build: {
      outDir: 'dist',
      target: 'esnext',
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            // Removed firebase manual chunk to allow correct dependency resolution order
          }
        }
      }
    },
    define: {
      'process.env.PHONEPE_MERCHANT_ID': JSON.stringify(env.PHONEPE_MERCHANT_ID || ""),
    },
  };
});
