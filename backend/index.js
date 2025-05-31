import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Bun reads .env automatically - no need for dotenv

// Import database connection
import { connectDatabase } from './config/database.js';

// Import routes
import { setupRoutes } from './routes/index.js';

// Import middlewares
import { errorHandler } from './middlewares/errorHandler.js';
import { frontendProxyMiddleware } from './middlewares/frontendProxy.js';

const app = new Hono();

// Global middlewares
app.use('*', logger());
app.use('*', prettyJSON());

// CORS configuration
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: process.env.CORS_CREDENTIALS === 'true'
}));

// Rate limiting (disabled for now)
// app.use('*', rateLimiter());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Setup API routes
setupRoutes(app);

// Global error handler
app.use('*', errorHandler);

// Frontend proxy middleware (must be last - catches all unmatched routes)
app.use('*', frontendProxyMiddleware);

// Initialize database connection when server starts
try {
  await connectDatabase();
  console.log('✅ Database connection established');
  
  const port = parseInt(process.env.PORT || '3000');
  console.log(`🚀 Starting server on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔄 Frontend Proxy: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
  }
} catch (error) {
  console.error('❌ Failed to initialize server:', error);
  process.exit(1);
}

// Export Bun-native server configuration
export default {
  port: parseInt(process.env.PORT || '3000'),
  hostname: process.env.HOST || '0.0.0.0',
  fetch: app.fetch,
};