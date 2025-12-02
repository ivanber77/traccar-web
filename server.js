#!/usr/bin/env node

import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.VITE_API_URL || process.env.API_URL || 'https://tracker.conecty.io';

console.log(`🚀 Starting server on port ${PORT}`);
console.log(`🔗 Backend URL: ${BACKEND_URL}`);

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
    if (!res.headersSent) {
      res.status(502).json({ 
        error: 'Bad Gateway', 
        message: 'Unable to connect to backend server',
        backend: BACKEND_URL
      });
    }
  }
}));

// Servir archivos estáticos desde build
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    backend: BACKEND_URL
  });
});

// SPA fallback - todas las rutas no encontradas van al index.html
app.get('*', (req, res) => {
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
