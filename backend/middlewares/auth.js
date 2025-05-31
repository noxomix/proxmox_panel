import jwt from 'jsonwebtoken';
import { HTTPException } from 'hono/http-exception';

export const authMiddleware = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'No valid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      throw new HTTPException(401, { message: 'No token provided' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    // Add user info to context
    c.set('user', decoded);
    c.set('userId', decoded.id);
    c.set('token', token);

    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    
    if (error.name === 'JsonWebTokenError') {
      throw new HTTPException(401, { message: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      throw new HTTPException(401, { message: 'Token expired' });
    }
    
    throw new HTTPException(401, { message: 'Authentication failed' });
  }
};

// Optional auth middleware (doesn't throw if no token)
export const optionalAuthMiddleware = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        c.set('user', decoded);
        c.set('userId', decoded.id);
        c.set('token', token);
      }
    }
  } catch (error) {
    // Silently ignore auth errors in optional middleware
  }
  
  await next();
};