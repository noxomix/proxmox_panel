import User from '../models/User.js';
import { apiResponse } from '../utils/response.js';
import { getAuthData } from '../utils/authHelper.js';

export const requirePermission = (permissionName) => {
  return async (c, next) => {
    try {
      const { user } = getAuthData(c);
      const currentNamespace = c.get('currentNamespace');
      
      if (!user || !user.id) {
        return c.json(apiResponse.error('Authentication required'), 401);
      }

      if (!currentNamespace) {
        return c.json(apiResponse.error('Namespace context required'), 400);
      }

      // Use namespace-aware permission check
      const hasPermission = await User.hasPermissionInNamespace(user.id, permissionName, currentNamespace.id);
      
      if (!hasPermission) {
        return c.json(apiResponse.error(`Permission '${permissionName}' required in namespace '${currentNamespace.name}'`), 403);
      }

      await next();
    } catch (error) {
      console.error('Permission check error:', error);
      return c.json(apiResponse.error('Permission check failed'), 500);
    }
  };
};

export const requireAnyPermission = (permissionNames) => {
  return async (c, next) => {
    try {
      const { user } = getAuthData(c);
      const currentNamespace = c.get('currentNamespace');
      
      if (!user || !user.id) {
        return c.json(apiResponse.error('Authentication required'), 401);
      }

      if (!currentNamespace) {
        return c.json(apiResponse.error('Namespace context required'), 400);
      }

      let hasAnyPermission = false;
      
      for (const permissionName of permissionNames) {
        const hasPermission = await User.hasPermissionInNamespace(user.id, permissionName, currentNamespace.id);
        if (hasPermission) {
          hasAnyPermission = true;
          break;
        }
      }
      
      if (!hasAnyPermission) {
        return c.json(apiResponse.error(`One of the following permissions required in namespace '${currentNamespace.name}': ${permissionNames.join(', ')}`), 403);
      }

      await next();
    } catch (error) {
      console.error('Permission check error:', error);
      return c.json(apiResponse.error('Permission check failed'), 500);
    }
  };
};