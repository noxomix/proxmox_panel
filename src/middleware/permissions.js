import User from '../models/User.js';
import { apiResponse } from '../utils/response.js';
import { getAuthData } from '../utils/authHelper.js';

export const requirePermission = (permissionName) => {
  return async (c, next) => {
    try {
      const { user } = getAuthData(c);
      
      if (!user || !user.id) {
        return c.json(apiResponse.error( 'Authentication required'), 401);
      }

      const hasPermission = await User.hasPermission(user.id, permissionName);
      
      if (!hasPermission) {
        return c.json(apiResponse.error( `Permission '${permissionName}' required`), 403);
      }

      await next();
    } catch (error) {
      console.error('Permission check error:', error);
      return c.json(apiResponse.error( 'Permission check failed'), 500);
    }
  };
};

export const requireAnyPermission = (permissionNames) => {
  return async (c, next) => {
    try {
      const { user } = getAuthData(c);
      
      if (!user || !user.id) {
        return c.json(apiResponse.error( 'Authentication required'), 401);
      }

      let hasAnyPermission = false;
      
      for (const permissionName of permissionNames) {
        const hasPermission = await User.hasPermission(user.id, permissionName);
        if (hasPermission) {
          hasAnyPermission = true;
          break;
        }
      }
      
      if (!hasAnyPermission) {
        return c.json(apiResponse.error( `One of the following permissions required: ${permissionNames.join(', ')}`), 403);
      }

      await next();
    } catch (error) {
      console.error('Permission check error:', error);
      return c.json(apiResponse.error( 'Permission check failed'), 500);
    }
  };
};