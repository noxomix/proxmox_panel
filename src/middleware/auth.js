import db from '../db.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import Namespace from '../models/Namespace.js';
import UserNamespaceRole from '../models/UserNamespaceRole.js';
import { jwtUtils } from '../utils/jwt.js';
import { apiResponse } from '../utils/response.js';
import NamespaceHelper from '../utils/namespaceHelper.js';

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
    
    try {
      // 1. Check for explicit X-Namespace-ID header first
      const namespaceHeader = c.req.header('X-Namespace-ID');
      if (namespaceHeader) {
        console.log('Trying namespace from header:', namespaceHeader);
        const headerNamespace = await db('namespaces').where('id', namespaceHeader).first();
        
        if (headerNamespace) {
          const userRole = await UserNamespaceRole.getRoleForUser(user.id, headerNamespace.id);
          if (userRole) {
            currentNamespace = headerNamespace;
            currentRole = userRole;
            console.log('Using namespace from header:', currentNamespace.name);
          }
        }
      }
      
      // 2. If no header or invalid header, get namespace with lowest depth (root)
      if (!currentNamespace) {
        console.log('No valid namespace from header, getting root namespace...');
        const rootNamespace = await db('namespaces')
          .orderBy('depth', 'asc')
          .first();
          
        console.log('Found root namespace:', rootNamespace);
        
        if (rootNamespace) {
          const userRole = await UserNamespaceRole.getRoleForUser(user.id, rootNamespace.id);
          console.log('User role in root namespace:', userRole);
          
          if (userRole) {
            currentNamespace = rootNamespace;
            currentRole = userRole;
            console.log('Using root namespace:', currentNamespace.name);
          }
        }
      }
    } catch (error) {
      console.error('Namespace resolution error in auth middleware:', error);
      currentNamespace = null;
      currentRole = null;
    }
    
    console.log('Final currentNamespace:', currentNamespace);

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