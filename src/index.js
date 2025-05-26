import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => {
  return c.json({ 
    message: 'Proxmox Panel API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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