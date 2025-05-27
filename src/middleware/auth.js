import Token from '../models/Token.js';
import User from '../models/User.js';
import { jwtUtils } from '../utils/jwt.js';
import { apiResponse } from '../utils/response.js';

export async function authMiddleware(c, next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(apiResponse.unauthorized('No token provided'), 401);
    }

    const token = authHeader.substring(7);

    // Try JWT verification first (new system)
    try {
      const payload = jwtUtils.verifyToken(token);
      
      // JWT verification successful - get user from payload
      const user = await User.findById(payload.id);
      
      if (!user) {
        return c.json(apiResponse.unauthorized('User not found'), 401);
      }

      // Store user info in context (JWT system)
      c.set('user', user);
      c.set('token', { 
        type: payload.type, 
        expires_at: new Date(payload.exp * 1000),
        jwt_id: payload.jti 
      });
      
      await next();
      return;
    } catch (jwtError) {
      // JWT verification failed, try legacy token system
      console.log('JWT verification failed, trying legacy token system');
    }

    // Fallback to legacy database token lookup
    const tokenRecord = await Token.findByToken(token);

    if (!tokenRecord) {
      return c.json(apiResponse.unauthorized('Invalid token'), 401);
    }

    // Check if token is expired
    if (tokenRecord.isExpired()) {
      await tokenRecord.revoke();
      return c.json(apiResponse.unauthorized('Token expired'), 401);
    }

    // Check if token expires within 30 minutes for legacy tokens
    const expiresAt = new Date(tokenRecord.expires_at);
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + (30 * 60 * 1000));

    // Only extend if token expires within 30 minutes
    if (expiresAt <= thirtyMinutesFromNow) {
      console.log('Legacy token expires soon, extending by 30 minutes');
      
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