import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const PROM_BASE = process.env.VITE_PROMETHEUS_BASE_URL || 'https://meet.in8.com/prometheus';

  return {

    base: isDev ? '/' : '/',

    plugins: [
      react(),
      ...(isDev ? [basicSsl()] : []), // SSL only in dev
    ],

    server: isDev
      ? {
          https: true,
          proxy: {
            '/api': {
              target: 'http://localhost:5000',
              changeOrigin: true,
            },
            '/prometheus': {
              target: PROM_BASE,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/prometheus/, ''),
            },
          },
          watch: {
            usePolling: true,
            interval: 100,
          },
        }
      : undefined,

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});
