import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { envConfig, config, isProduction } from './config/environment.js';
import auth from './controllers/auth/AuthController.js';
import users from './controllers/UserController.js';
import roles from './controllers/RoleController.js';
import permissions from './controllers/PermissionController.js';
import debug from './controllers/DebugController.js';
import NamespaceController from './controllers/NamespaceController.js';

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

// Mount user management routes
app.route('/api/users', users);

// Mount role and permission management routes
app.route('/api/roles', roles);
app.route('/api/permissions', permissions);

// Mount namespace routes (no auth required)
app.get('/api/namespaces', NamespaceController.getNamespaces);
app.get('/api/namespaces/:id', NamespaceController.getNamespace);
app.post('/api/namespaces', NamespaceController.createNamespace);
app.patch('/api/namespaces/:id', NamespaceController.updateNamespace);
app.delete('/api/namespaces/:id', NamespaceController.deleteNamespace);
app.get('/api/namespaces/:id/tree', NamespaceController.getNamespaceTree);

// Mount debug routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.route('/api/debug', debug);
}

// Serve theme CSS dynamically
app.get('/api/theme-css', async (c) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const cssPath = path.join(process.cwd(), 'src', 'brand.css');
    const css = await fs.readFile(cssPath, 'utf-8');
    
    return c.text(css, 200, {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  } catch (error) {
    console.error('Error reading brand.css:', error);
    return c.text('/* Error loading brand colors */', 500, {
      'Content-Type': 'text/css; charset=utf-8'
    });
  }
});

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

// Validate environment configuration on startup
if (!envConfig.isValid()) {
  console.error('🔴 FATAL: Invalid environment configuration');
  envConfig.logStatus();
  if (isProduction()) {
    process.exit(1);
  }
} else {
  envConfig.logStatus();
}

// Export app for server.js and testing
export default app;
export { app };