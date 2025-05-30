import Namespace from '../models/Namespace.js';

/**
 * Global namespace resolution helper
 * Resolves namespace based on X-Namespace-ID header or domain
 */
export class NamespaceHelper {
  /**
   * Get current namespace based on request context
   * Priority: X-Namespace-ID header > Domain mapping > Root namespace (depth 0)
   * 
   * @param {Object} request - Hono request object
   * @returns {Promise<Object|null>} Namespace object or null
   */
  static async getCurrentNamespace(request) {
    // 1. Check for explicit X-Namespace-ID header
    const namespaceId = request.header('X-Namespace-ID');
    if (namespaceId) {
      const namespace = await Namespace.findById(namespaceId);
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
      
      const namespaceByDomain = await Namespace.findByDomain(domain);
      if (namespaceByDomain) {
        return namespaceByDomain;
      }
    }

    // 3. Fallback to root namespace (depth 0)
    const rootNamespace = await Namespace.findRoot();
    if (rootNamespace) {
      return rootNamespace;
    }

    // 4. No namespace found - this should never happen in a properly set up system
    console.error('No namespace could be resolved - no root namespace found!');
    return null;
  }

  /**
   * Middleware function to set current namespace in context
   * 
   * @param {Object} c - Hono context
   * @param {Function} next - Next middleware function
   */
  static async middleware(c, next) {
    const currentNamespace = await NamespaceHelper.getCurrentNamespace(c.req);
    
    if (!currentNamespace) {
      return c.json({
        success: false,
        message: 'No valid namespace could be resolved',
        meta: {
          timestamp: new Date().toISOString(),
          statusCode: 500
        }
      }, 500);
    }

    // Set namespace in context for use in route handlers
    c.set('currentNamespace', currentNamespace);
    
    await next();
  }

  /**
   * Hook function to get current namespace from context
   * Use this in route handlers: const currentNamespace = useCurrentNamespace(c);
   * 
   * @param {Object} c - Hono context
   * @returns {Object} Current namespace object
   */
  static useCurrentNamespace(c) {
    const namespace = c.get('currentNamespace');
    if (!namespace) {
      throw new Error('No current namespace found in context. Make sure NamespaceHelper.middleware is applied.');
    }
    return namespace;
  }

  /**
   * Get namespace hierarchy path for current namespace
   * 
   * @param {Object} c - Hono context
   * @returns {Promise<Array>} Array of namespaces from root to current
   */
  static async getNamespaceHierarchy(c) {
    const currentNamespace = NamespaceHelper.useCurrentNamespace(c);
    return await Namespace.getHierarchy(currentNamespace.id);
  }

  /**
   * Check if user has access to current namespace
   * 
   * @param {Object} c - Hono context
   * @param {string} userId - User ID to check
   * @returns {Promise<boolean>} True if user has access
   */
  static async userHasAccessToCurrentNamespace(c, userId) {
    const currentNamespace = NamespaceHelper.useCurrentNamespace(c);
    const UserNamespaceRole = (await import('../models/UserNamespaceRole.js')).default;
    
    const userRole = await UserNamespaceRole.getRoleForUser(userId, currentNamespace.id);
    return !!userRole;
  }
}

/**
 * Convenience function to get current namespace
 * Use this in route handlers: const currentNamespace = useCurrentNamespace(c);
 * 
 * @param {Object} c - Hono context
 * @returns {Object} Current namespace object
 */
export function useCurrentNamespace(c) {
  return NamespaceHelper.useCurrentNamespace(c);
}

export default NamespaceHelper;