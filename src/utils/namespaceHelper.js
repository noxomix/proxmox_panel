import db from '../db.js';

/**
 * Central namespace resolution directive
 * Priority: X-Namespace-ID header > Domain mapping > Root namespace (lowest depth)
 * 
 * @param {Object} request - Hono request object
 * @returns {Promise<Object|null>} Namespace object or null
 */
export async function useCurrentNamespace(request) {
  try {
    // 1. Check for explicit X-Namespace-ID header
    const namespaceId = request.header('X-Namespace-ID');
    if (namespaceId) {
      const namespace = await db('namespaces').where('id', namespaceId).first();
      if (namespace) {
        return namespace;
      }
      // If explicit ID is invalid, log warning but continue with fallback
      console.warn(`Invalid X-Namespace-ID provided: ${namespaceId}`);
    }

    // 2. Try to resolve by domain
    const host = request.header('Host') || request.header('host');
    if (host) {
      // Remove port number if present (e.g., localhost:3000 -> localhost)
      const domain = host.split(':')[0];
      
      const namespaceByDomain = await db('namespaces').where('domain', domain).first();
      if (namespaceByDomain) {
        return namespaceByDomain;
      }
    }

    // 3. Fallback to root namespace (lowest depth)
    const rootNamespace = await db('namespaces')
      .orderBy('depth', 'asc')
      .first();
      
    if (rootNamespace) {
      return rootNamespace;
    }

    // 4. No namespace found - this should never happen in a properly set up system
    console.error('No namespace could be resolved - no root namespace found!');
    return null;
  } catch (error) {
    console.error('Error in useCurrentNamespace:', error);
    return null;
  }
}

/**
 * Middleware factory for namespace resolution
 * Automatically resolves and sets namespace context based on priority
 */
export function createNamespaceMiddleware() {
  return async (c, next) => {
    try {
      const namespace = await useCurrentNamespace(c.req);
      
      if (namespace) {
        c.set('currentNamespace', namespace);
      } else {
        console.error('Critical: No namespace could be resolved');
        return c.json({
          success: false,
          message: 'System error: No namespace context available',
          meta: {
            timestamp: new Date().toISOString(),
            statusCode: 500
          }
        }, 500);
      }
      
      await next();
    } catch (error) {
      console.error('Namespace middleware error:', error);
      return c.json({
        success: false,
        message: 'Failed to resolve namespace context',
        meta: {
          timestamp: new Date().toISOString(),
          statusCode: 500
        }
      }, 500);
    }
  };
}

/**
 * Legacy compatibility - will be removed
 * @deprecated Use useCurrentNamespace() directly
 */
export class NamespaceHelper {
  static async getCurrentNamespace(request) {
    return await useCurrentNamespace(request);
  }
  
  static useCurrentNamespace(c) {
    const namespace = c.get('currentNamespace');
    if (!namespace) {
      throw new Error('No current namespace found in context. Make sure namespace is set in context.');
    }
    return namespace;
  }

  static get middleware() {
    return createNamespaceMiddleware();
  }
}

export default { useCurrentNamespace, createNamespaceMiddleware, NamespaceHelper };