import Namespace from '../models/Namespace.js';
import UserNamespaceRole from '../models/UserNamespaceRole.js';
import { apiResponse } from '../utils/response.js';
import { getAuthData } from '../utils/authHelper.js';
import db from '../db.js';

/**
 * Middleware for optional namespace switching
 * Allows switching namespace context via X-Namespace-ID header
 * Falls back to current namespace if header not provided
 */
export const optionalNamespaceSwitch = async (c, next) => {
  try {
    const { user } = getAuthData(c);
    let currentNamespace = c.get('currentNamespace');
    let currentRole = c.get('currentRole');
    
    // Check if user wants to switch namespace
    const switchToNamespaceId = c.req.header('X-Namespace-ID');
    
    if (switchToNamespaceId && switchToNamespaceId !== currentNamespace?.id) {
      // Validate new namespace exists
      const targetNamespace = await Namespace.findById(switchToNamespaceId);
      if (!targetNamespace) {
        return c.json(apiResponse.validation({ namespace: ['Invalid namespace ID'] }), 400);
      }
      
      // Check if user has access to target namespace
      const userRole = await UserNamespaceRole.getRoleForUser(user.id, targetNamespace.id);
      if (!userRole) {
        return c.json(apiResponse.forbidden('User has no access to the specified namespace'), 403);
      }
      
      // Update context
      currentNamespace = targetNamespace;
      currentRole = userRole;
      c.set('currentNamespace', currentNamespace);
      c.set('currentRole', currentRole);
    }
    
    await next();
  } catch (error) {
    console.error('Namespace switch error:', error);
    return c.json(apiResponse.error('Failed to switch namespace'), 500);
  }
};

/**
 * Middleware that requires a specific namespace to be set
 * Used for namespace-specific operations
 */
export const requireNamespace = async (c, next) => {
  try {
    const currentNamespace = c.get('currentNamespace');
    
    if (!currentNamespace) {
      return c.json(apiResponse.error('Namespace context required. Please specify X-Namespace-ID header or access via namespace domain.'), 400);
    }
    
    await next();
  } catch (error) {
    console.error('Namespace requirement error:', error);
    return c.json(apiResponse.error('Namespace validation failed'), 500);
  }
};

/**
 * Middleware for domain-based namespace detection
 * Checks if the request domain matches a namespace domain
 */
export const domainNamespaceDetection = async (c, next) => {
  try {
    const { user } = getAuthData(c);
    let currentNamespace = c.get('currentNamespace');
    let currentRole = c.get('currentRole');
    
    // Only try domain detection if no namespace is set yet
    if (!currentNamespace) {
      const host = c.req.header('Host');
      if (host) {
        const domain = host.split(':')[0]; // Remove port if present
        const domainNamespace = await db('namespaces').where('domain', domain).first();
        
        if (domainNamespace) {
          // Check if user has access to this namespace
          const userRole = await UserNamespaceRole.getRoleForUser(user.id, domainNamespace.id);
          if (userRole) {
            currentNamespace = domainNamespace;
            currentRole = userRole;
            c.set('currentNamespace', currentNamespace);
            c.set('currentRole', currentRole);
          }
        }
      }
    }
    
    await next();
  } catch (error) {
    console.error('Domain namespace detection error:', error);
    return c.json(apiResponse.error('Domain namespace detection failed'), 500);
  }
};

/**
 * Middleware that ensures fallback to root namespace
 * Used as last resort if no other namespace context is available
 */
export const ensureNamespaceContext = async (c, next) => {
  try {
    const { user } = getAuthData(c);
    let currentNamespace = c.get('currentNamespace');
    let currentRole = c.get('currentRole');
    
    // If still no namespace, try root namespace as fallback
    if (!currentNamespace) {
      const rootNamespace = await db('namespaces')
        .where({ parent_id: null })
        .first();
        
      if (rootNamespace) {
        const userRole = await UserNamespaceRole.getRoleForUser(user.id, rootNamespace.id);
        if (userRole) {
          currentNamespace = rootNamespace;
          currentRole = userRole;
          c.set('currentNamespace', currentNamespace);
          c.set('currentRole', currentRole);
        }
      }
    }
    
    await next();
  } catch (error) {
    console.error('Namespace context ensure error:', error);
    return c.json(apiResponse.error('Failed to establish namespace context'), 500);
  }
};

/**
 * Combined namespace middleware that applies all namespace detection strategies
 * Use this for most routes that need namespace context
 */
export const namespaceMiddleware = async (c, next) => {
  await optionalNamespaceSwitch(c, async () => {
    await domainNamespaceDetection(c, async () => {
      await ensureNamespaceContext(c, next);
    });
  });
};