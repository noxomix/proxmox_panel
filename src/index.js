import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import auth from './controllers/auth/AuthController.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

// API routes
app.get('/api', (c) => {
  return c.json({ 
    message: 'Proxmox Panel API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount auth routes
app.route('/api/auth', auth);

// In production, serve static files
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './frontend/dist' }));
  app.get('*', serveStatic({ path: './frontend/dist/index.html' }));
} else {
  // In development, proxy non-API requests to Vite dev server
  app.get('*', async (c) => {
    const url = new URL(c.req.url);
    if (!url.pathname.startsWith('/api')) {
      const viteUrl = `http://localhost:3001${url.pathname}${url.search}`;
      const response = await fetch(viteUrl);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
  });
}

const port = process.env.PORT || 3000;

console.log(`🚀 Server läuft auf http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const { serve } = await import('@hono/node-server');
  
  serve({
    fetch: app.fetch,
    port,
  });
  
  console.log(`🚀 Server läuft auf http://localhost:${port}`);
}