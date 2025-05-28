import db from '../db.js';
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

    // JWT verification (only supported authentication method)
    const payload = jwtUtils.verifyToken(token);
    
    // Check if session is revoked by looking up jwt_id in database
    const sessionRecord = await db('tokens')
      .where('jwt_id', payload.jti)
      .where('type', 'session')
      .where('expires_at', '>', new Date())
      .first();

    // If no session record found, the session has been revoked
    if (!sessionRecord) {
      return c.json(apiResponse.unauthorized('Session has been revoked'), 401);
    }
    
    // Get user from payload
    const user = await User.findById(payload.id);
    
    if (!user) {
      return c.json(apiResponse.unauthorized('User not found'), 401);
    }

    // Store user info in context
    c.set('user', user);
    c.set('token', { 
      type: payload.type, 
      expires_at: new Date(payload.exp * 1000),
      jwt_id: payload.jti 
    });
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json(apiResponse.unauthorized('Invalid or expired token'), 401);
  }
}