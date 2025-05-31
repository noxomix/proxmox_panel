import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database connection
import { connectDatabase } from './config/database.js';

// Import routes
import { setupRoutes } from './routes/index.js';

// Import middlewares
import { errorHandler } from './middlewares/errorHandler.js';
import { authMiddleware } from './middlewares/auth.js';

const app = new Hono();

// Global middlewares
app.use('*', logger());
app.use('*', prettyJSON());

/*/ CORS configuration
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: process.env.CORS_CREDENTIALS === 'true'
})); /*/

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

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    data: null,
    message: 'Route not found'
  }, 404);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await connectDatabase();
    console.log('✅ Database connection established');

    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    console.log(`🚀 Starting server on ${host}:${port}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);

    serve({
      fetch: app.fetch,
      port,
      hostname: host
    });

    console.log(`✅ Server running on http://${host}:${port}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();