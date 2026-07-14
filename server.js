#!/usr/bin/env node

import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.API_URL || process.env.VITE_API_URL || 'https://tracker.conecty.io';

/**
 * One-shot browser cache wipe for clients stuck on old index/sw (max-age=1y).
 * Active until end of 2026-07-14 America/Argentina (~03:00 UTC Jul 15).
 * After that, header is not sent.
 */
const CACHE_BUST_UNTIL_MS = Date.parse('2026-07-15T03:00:00.000Z');

function shouldOneTimeCacheBust() {
  return Date.now() < CACHE_BUST_UNTIL_MS;
}

function setHtmlNoCache(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (shouldOneTimeCacheBust()) {
    // Forces browsers that hit the origin today to drop the stale HTTP cache.
    res.setHeader('Clear-Site-Data', '"cache"');
  }
}

console.log(`🚀 Starting server on port ${PORT}`);
console.log(`🔗 Backend URL: ${BACKEND_URL}`);
if (shouldOneTimeCacheBust()) {
  console.log('🧹 One-time cache bust active until 2026-07-15T03:00:00Z');
}

// Proxy para /api (HTTP y WebSocket)
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  ws: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${BACKEND_URL}${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err.message);
    if (res && typeof res.status === 'function' && !res.headersSent) {
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Unable to connect to backend server',
        backend: BACKEND_URL,
      });
    }
  },
}));

const buildPath = path.join(__dirname, 'build');

// SPA shell + SW must not be long-cached (hashed /assets/* can be).
const noCacheExact = new Set([
  '/index.html',
  '/sw.js',
  '/manifest.webmanifest',
  '/registerSW.js',
]);

app.use((req, res, next) => {
  const urlPath = req.path || '';
  const isNoCacheShell = noCacheExact.has(urlPath)
    || /^\/workbox-[^/]+\.js$/.test(urlPath);
  if (isNoCacheShell) {
    setHtmlNoCache(res);
  }
  next();
});

// Hashed build assets: long cache. Everything else short / etag.
app.use(express.static(buildPath, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }
    if (
      normalized.endsWith('/index.html')
      || normalized.endsWith('/sw.js')
      || normalized.endsWith('/manifest.webmanifest')
      || normalized.endsWith('/registerSW.js')
      || /\/workbox-[^/]+\.js$/.test(normalized)
    ) {
      setHtmlNoCache(res);
    }
  },
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    backend: BACKEND_URL,
    oneTimeCacheBust: shouldOneTimeCacheBust(),
  });
});

// SPA fallback - todas las rutas no encontradas van al index.html
app.get('*', (req, res) => {
  setHtmlNoCache(res);
  res.sendFile(path.join(buildPath, 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Serving static files from: ${buildPath}`);
  console.log(`✅ Proxying /api/* to: ${BACKEND_URL}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
