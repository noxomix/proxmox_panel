import { jwt } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { db } from '../config/database.js';
import { tokens } from '../database/schemas/tokens.js';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// Create Hono JWT middleware instance
const jwtMiddleware = jwt({
  secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-this-in-production-min-32-chars'
});

export const authMiddleware = async (c, next) => {
  try {
    // First, validate JWT with Hono's middleware
    await jwtMiddleware(c, async () => {});
    
    // Get payload from Hono JWT middleware
    const payload = c.get('jwtPayload');
    
    if (!payload || !payload.token_id) {
      throw new HTTPException(401, { message: 'Invalid token payload' });
    }

    // Create token hash for database lookup
    const tokenFromHeader = c.req.header('Authorization')?.substring(7);
    if (!tokenFromHeader) {
      throw new HTTPException(401, { message: 'No token provided' });
    }
    
    const tokenHash = createHash('sha256').update(tokenFromHeader).digest('hex');

    // Validate session exists in database
    const session = await db
      .select()
      .from(tokens)
      .where(eq(tokens.token_hash, tokenHash))
      .limit(1);

    if (!session.length) {
      throw new HTTPException(401, { message: 'Session not found or expired' });
    }

    const sessionData = session[0];

    // Check if session is expired
    if (sessionData.expires_at && new Date() > sessionData.expires_at) {
      // Clean up expired session
      await db.delete(tokens).where(eq(tokens.id, sessionData.id));
      throw new HTTPException(401, { message: 'Session expired' });
    }

    // Add session info to context
    c.set('user', { 
      id: sessionData.user_id,
      token_id: sessionData.id,
      type: sessionData.type
    });
    c.set('session', sessionData);

    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Handle Hono JWT errors
    if (error.message?.includes('Invalid JWT')) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }
    
    throw new HTTPException(401, { message: 'Authentication failed' });
  }
};

// Optional auth middleware (doesn't throw if no token)
export const optionalAuthMiddleware = async (c, next) => {
  try {
    await authMiddleware(c, next);
  } catch (error) {
    // Silently ignore auth errors in optional middleware
    await next();
  }
};