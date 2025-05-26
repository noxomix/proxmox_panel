import { authMiddleware } from '../middleware/auth.js';

/**
 * Helper function to apply auth middleware to all routes in a Hono app
 * @param {Hono} app - The Hono app instance
 * @param {string} basePath - Optional base path (default: '*')
 */
export function protectRoutes(app, basePath = '*') {
  app.use(basePath, authMiddleware);
}

/**
 * Helper to get authenticated user from context
 * @param {Context} c - Hono context
 * @returns {User} The authenticated user
 */
export function getAuthUser(c) {
  return c.get('user');
}

/**
 * Helper to get auth token from context
 * @param {Context} c - Hono context  
 * @returns {Token} The auth token
 */
export function getAuthToken(c) {
  return c.get('token');
}

/**
 * Helper to get both user and token
 * @param {Context} c - Hono context
 * @returns {Object} { user, token }
 */
export function getAuthData(c) {
  return {
    user: c.get('user'),
    token: c.get('token')
  };
}