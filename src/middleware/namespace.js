import { createNamespaceMiddleware } from '../utils/namespaceHelper.js';
import UserNamespaceRole from '../models/UserNamespaceRole.js';
import { apiResponse } from '../utils/response.js';
import { getAuthData } from '../utils/authHelper.js';

/**
 * Global namespace middleware using the improved directive
 * Resolves namespace based on priority:
 * 1. X-Namespace-ID header
 * 2. Domain mapping
 * 3. Root namespace (lowest depth)
 */
export const namespaceMiddleware = createNamespaceMiddleware();

/**
 * Middleware to require that a namespace context exists
 * Should be used after namespaceMiddleware
 */
export const requireNamespace = async (c, next) => {
  const currentNamespace = c.get('currentNamespace');
  
  if (!currentNamespace) {
    return c.json({
      success: false,
      message: 'Namespace context required but not found',
      meta: {
        timestamp: new Date().toISOString(),
        statusCode: 500
      }
    }, 500);
  }

  await next();
};

/**
 * Middleware to ensure user has access to the current namespace
 * Sets currentRole in context if user has access
 */
export const validateNamespaceAccess = async (c, next) => {
  try {
    const { user } = getAuthData(c);
    const currentNamespace = c.get('currentNamespace');
    
    if (!currentNamespace) {
      return c.json(
        apiResponse.error('No namespace context available'),
        500
      );
    }

    // Check if user has access to current namespace
    const userRole = await UserNamespaceRole.getRoleForUser(user.id, currentNamespace.id);
    if (!userRole) {
      return c.json(
        apiResponse.forbidden(`User has no access to namespace: ${currentNamespace.name}`),
        403
      );
    }

    // Set role in context for use in route handlers
    c.set('currentRole', userRole);
    
    await next();
  } catch (error) {
    console.error('Namespace access validation error:', error);
    return c.json(
      apiResponse.error('Failed to validate namespace access'),
      500
    );
  }
};

/**
 * Optional namespace switching middleware
 * Allows explicit namespace switching via X-Namespace-ID header
 * Validates user has access to target namespace
 */
export const optionalNamespaceSwitch = async (c, next) => {
  try {
    const { user } = getAuthData(c);
    const switchToNamespaceId = c.req.header('X-Namespace-ID');
    
    // If explicit namespace switch requested, validate access
    if (switchToNamespaceId) {
      const { resolveNamespace } = await import('../utils/namespaceHelper.js');
      const targetNamespace = await resolveNamespace(c.req);
      
      if (targetNamespace && targetNamespace.id === switchToNamespaceId) {
        // Check if user has access to target namespace
        const userRole = await UserNamespaceRole.getRoleForUser(user.id, targetNamespace.id);
        if (!userRole) {
          return c.json(
            apiResponse.forbidden('User has no access to the specified namespace'),
            403
          );
        }
        
        // Update context
        c.set('currentNamespace', targetNamespace);
        c.set('currentRole', userRole);
      } else {
        return c.json(
          apiResponse.validation({ namespace: ['Invalid namespace ID'] }),
          400
        );
      }
    }
    
    await next();
  } catch (error) {
    console.error('Namespace switch error:', error);
    return c.json(apiResponse.error('Failed to switch namespace'), 500);
  }
};

/**
 * Legacy middleware functions for backward compatibility
 * @deprecated Use namespaceMiddleware instead
 */
export const domainNamespaceDetection = namespaceMiddleware;
export const ensureNamespaceContext = namespaceMiddleware;