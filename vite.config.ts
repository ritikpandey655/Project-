
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve('.'), '');
  
  return {
    publicDir: 'public',
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
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
          }
        }
      }
    },
    // We strictly DO NOT define API keys here anymore.
    // This forces the app to use the Backend for all AI operations.
    define: {
      'process.env.PHONEPE_MERCHANT_ID': JSON.stringify(env.PHONEPE_MERCHANT_ID || ""),
    },
  };
});
