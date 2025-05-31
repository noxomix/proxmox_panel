import { Hono } from 'hono';
import User from '../models/User.js';
import { apiResponse } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.js';
import { getAuthData } from '../utils/authHelper.js';

const debug = new Hono();

// Apply authentication middleware
debug.use('*', authMiddleware);

/**
 * GET /api/debug/permissions - Debug user permissions
 */
debug.get('/permissions', async (c) => {
  try {
    const { user } = getAuthData(c);
    
    // Get all permissions
    const allPermissions = await User.getPermissions(user.id);
    const rolePermissions = await User.getRolePermissions(user.id);
    const directPermissions = await User.getDirectPermissions(user.id);
    
    // Check specific permission
    const hasUserIndex = await User.hasPermission(user.id, 'user_index');
    
    // Get user details with role
    const fullUser = await User.findById(user.id);
    
    return c.json(
      apiResponse.success({
        user: {
          id: user.id,
          email: fullUser.email,
          name: fullUser.name,
          role_id: fullUser.role_id,
          role_name: fullUser.role_name,
          role_display_name: fullUser.role_display_name
        },
        permissions: {
          total: allPermissions.length,
          has_user_index: hasUserIndex,
          all: allPermissions.map(p => p.name),
          from_role: rolePermissions.map(p => p.name),
          direct: directPermissions.map(p => p.name)
        }
      }, 'Debug information'),
      200
    );
  } catch (error) {
    console.error('Debug error:', error);
    return c.json(
      apiResponse.error('Debug failed: ' + error.message),
      500
    );
  }
});

/**
 * GET /api/debug/permissions-all - Debug permissions/all endpoint
 */
debug.get('/permissions-all', async (c) => {
  try {
    const { Permission } = await import('../models/Permission.js');
    const permissions = await Permission.findAll();
    
    return c.json(
      apiResponse.success({
        count: permissions.length,
        permissions: permissions
      }, 'Permissions debug'),
      200
    );
  } catch (error) {
    console.error('Debug permissions error:', error);
    return c.json(
      apiResponse.error('Debug failed: ' + error.message),
      500
    );
  }
});

export default debug;