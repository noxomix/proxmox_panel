import Token from '../models/Token.js';
import User from '../models/User.js';
import { apiResponse } from '../utils/response.js';

export async function authMiddleware(c, next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(apiResponse.unauthorized('No token provided'), 401);
    }

    const token = authHeader.substring(7);
    const tokenRecord = await Token.findByToken(token);

    if (!tokenRecord) {
      return c.json(apiResponse.unauthorized('Invalid token'), 401);
    }

    // Check if token is expired
    if (tokenRecord.isExpired()) {
      await tokenRecord.revoke();
      return c.json(apiResponse.unauthorized('Token expired'), 401);
    }

    // Check if token expires within 30 minutes (1800 seconds)
    const expiresAt = new Date(tokenRecord.expires_at);
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + (30 * 60 * 1000));

    // Only extend if token expires within 30 minutes
    if (expiresAt <= thirtyMinutesFromNow) {
      console.log('Token expires soon, extending by 30 minutes');
      
      // Extend by 30 minutes from current time
      const newExpiresAt = new Date(now.getTime() + (30 * 60 * 1000));
      
      await tokenRecord.updateExpiry(newExpiresAt);
    }

    // Find user and attach to context
    const user = await User.findById(tokenRecord.user_id);
    if (!user) {
      return c.json(apiResponse.unauthorized('User not found'), 401);
    }

    // Add user and token to context for use in route handlers
    c.set('user', user);
    c.set('token', tokenRecord);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json(apiResponse.error('Authentication failed', null, 500), 500);
  }
}