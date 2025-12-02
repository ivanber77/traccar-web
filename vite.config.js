import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  // Backend URL desde variable de entorno o default
  const backendUrl = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:8082';
  const backendHost = new URL(backendUrl).hostname;
  const backendPort = new URL(backendUrl).port || (backendUrl.includes('https') ? '443' : '80');
  const backendProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
  const backendHttpProtocol = backendUrl.startsWith('https') ? 'https' : 'http';
  
  return {
  server: {
    port: 3000,
    proxy: {
      '/api/socket': {
        target: `${backendHttpProtocol}://${backendHost}:${backendPort}`,
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: `${backendHttpProtocol}://${backendHost}:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8082'),
  },
  plugins: [
    svgr(),
    react(),
    VitePWA({
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,woff,woff2,mp3}'],
      },
      manifest: {
        short_name: 'ConectyTrack',
        name: 'ConectyTrack GPS Tracking System',
        theme_color: '${colorPrimary}',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js', dest: '' },
      ],
    }),
  ],
  };
});
