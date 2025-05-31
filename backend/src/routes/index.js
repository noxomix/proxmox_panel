import { Hono } from 'hono';

// Import route modules
import { authRoutes } from './auth.js';
import { userRoutes } from './users.js';
// import { roleRoutes } from './roles.js';
// import { permissionRoutes } from './permissions.js';
// import { namespaceRoutes } from './namespaces.js';

export const setupRoutes = (app) => {
  // Create API route group
  const api = new Hono();

  // API info endpoint
  api.get('/', (c) => {
    return c.json({
      success: true,
      data: {
        name: 'Proxmox Panel API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Mount route modules
  api.route('/auth', authRoutes);
  api.route('/users', userRoutes);
  // api.route('/roles', roleRoutes);
  // api.route('/permissions', permissionRoutes);
  // api.route('/namespaces', namespaceRoutes);

  // Mount API routes under /api prefix
  app.route('/api', api);

  return app;
};