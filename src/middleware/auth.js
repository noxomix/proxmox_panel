import db from '../db.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import Namespace from '../models/Namespace.js';
import UserNamespaceRole from '../models/UserNamespaceRole.js';
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

    // Extract namespace context from request
    let currentNamespace = null;
    let currentRole = null;
    
    // 1. Try X-Namespace-ID header first
    const namespaceHeader = c.req.header('X-Namespace-ID');
    if (namespaceHeader) {
      currentNamespace = await Namespace.findById(namespaceHeader);
      
      if (currentNamespace) {
        // Get user's role in this namespace
        const userRole = await UserNamespaceRole.getRoleForUser(user.id, currentNamespace.id);
        if (userRole) {
          currentRole = userRole;
        } else {
          return c.json(apiResponse.forbidden('User has no access to this namespace'), 403);
        }
      } else {
        return c.json(apiResponse.validation({ namespace: ['Invalid namespace ID'] }), 400);
      }
    } else {
      // 2. Try domain-based namespace detection
      const host = c.req.header('Host');
      if (host) {
        const domain = host.split(':')[0]; // Remove port if present
        const domainNamespace = await db('namespaces').where('domain', domain).first();
        
        if (domainNamespace) {
          currentNamespace = domainNamespace;
          const userRole = await UserNamespaceRole.getRoleForUser(user.id, currentNamespace.id);
          if (userRole) {
            currentRole = userRole;
          }
        }
      }
      
      // 3. Fallback to root namespace if user has access
      if (!currentNamespace) {
        const rootNamespace = await db('namespaces')
          .where({ parent_id: null })
          .first();
          
        if (rootNamespace) {
          const userRole = await UserNamespaceRole.getRoleForUser(user.id, rootNamespace.id);
          if (userRole) {
            currentNamespace = rootNamespace;
            currentRole = userRole;
          }
        }
      }
    }

    // Store user info with namespace context in context
    c.set('user', user);
    c.set('currentNamespace', currentNamespace);
    c.set('currentRole', currentRole);
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