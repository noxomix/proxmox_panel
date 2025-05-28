import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { apiResponse } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { getAuthData } from '../utils/authHelper.js';
import { security } from '../utils/security.js';
import { strictRateLimit } from '../middleware/rateLimiter.js';
import { PermissionHelper } from '../utils/permissionHelper.js';
import db from '../db.js';

const users = new Hono();

// Apply authentication middleware to all routes
users.use('*', authMiddleware);

// Apply rate limiting only to sensitive operations
users.use('/*/delete', strictRateLimit);
users.post('/', strictRateLimit); // Only for create operations

// Apply permission checks to specific routes
// Permission middleware is applied within each endpoint

/**
 * GET /api/users - List users with pagination and search
 */
users.get('/', async (c) => {
  try {
    // Check permission
    const { user: currentUser } = getAuthData(c);
    const hasPermission = await User.hasPermission(currentUser.id, 'user_index');
    if (!hasPermission) {
      return c.json(
        apiResponse.error('Access denied'),
        403
      );
    }
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 10;
    const search = c.req.query('search') || '';
    const status = c.req.query('status') || '';
    const sortBy = c.req.query('sortBy') || 'created_at';
    const sortOrder = c.req.query('sortOrder') || 'desc';

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return c.json(
        apiResponse.validation({
          pagination: ['Invalid pagination parameters']
        }),
        400
      );
    }

    // Validate sort parameters
    const validSortFields = ['id', 'name', 'email', 'status', 'created_at', 'updated_at', 'role_name'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sortBy) || !validSortOrders.includes(sortOrder)) {
      return c.json(
        apiResponse.validation({
          sort: ['Invalid sort parameters']
        }),
        400
      );
    }

    const result = await User.paginate({
      page,
      limit,
      search: security.sanitizeInput(search),
      status: status ? security.sanitizeInput(status) : '',
      sortBy,
      sortOrder
    });

    // Add can_edit field for each user
    const usersWithCanEdit = await Promise.all(
      result.data.map(async (user) => {
        // Allow profile editing for self, admin editing for others based on permissions
        const canEditProfile = currentUser.id === user.id;
        const canEditOthers = currentUser.id !== user.id ? 
          await PermissionHelper.canManageUser(currentUser.id, user.id) : false;
        
        return {
          ...user.toJSON(),
          can_edit: canEditProfile || canEditOthers
        };
      })
    );

    return c.json(
      apiResponse.success({
        users: usersWithCanEdit,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        }
      }, 'Users retrieved successfully'),
      200
    );

  } catch (error) {
    console.error('List users error:', error);
    return c.json(
      apiResponse.error('Failed to retrieve users'),
      500
    );
  }
});

/**
 * GET /api/users/:id - Get single user
 */
users.get('/:id', async (c) => {
  try {
    // Check permission
    const { user: currentUser } = getAuthData(c);
    const hasPermission = await User.hasPermission(currentUser.id, 'user_show');
    if (!hasPermission) {
      return c.json(
        apiResponse.error('Access denied'),
        403
      );
    }
    const userId = c.req.param('id');
    
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return c.json(
        apiResponse.validation({ id: ['Invalid user ID'] }),
        400
      );
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }

    return c.json(
      apiResponse.success({
        user: user.toJSON()
      }, 'User retrieved successfully'),
      200
    );

  } catch (error) {
    console.error('Get user error:', error);
    return c.json(
      apiResponse.error('Failed to retrieve user'),
      500
    );
  }
});

/**
 * POST /api/users - Create new user
 */
users.post('/', async (c) => {
  try {
    // Check permission
    const { user: currentUser } = getAuthData(c);
    const hasPermission = await User.hasPermission(currentUser.id, 'user_create');
    if (!hasPermission) {
      return c.json(
        apiResponse.error('Access denied'),
        403
      );
    }
    const { name, email, password, role_id, status = 'active' } = await c.req.json();

    // Validate required fields
    const errors = {};
    
    if (!name) {
      errors.name = ['Name is required'];
    } else if (!security.isValidName(name)) {
      errors.name = ['Invalid name format (2-50 characters, letters, spaces, hyphens and apostrophes only)'];
    }

    if (!email) {
      errors.email = ['Email is required'];
    } else if (!security.isValidEmail(email)) {
      errors.email = ['Invalid email format'];
    }

    if (!password) {
      errors.password = ['Password is required'];
    } else {
      const passwordValidation = security.validatePassword(password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors;
      }
    }

    // Validate role_id - role is required
    if (!role_id) {
      errors.role_id = ['Role is required'];
    } else {
      const Role = (await import('../models/Role.js')).Role;
      const roleExists = await Role.findById(role_id);
      if (!roleExists) {
        errors.role_id = ['Invalid role ID'];
      } else {
        // Check if current user can assign this role
        const { user: currentUser } = getAuthData(c);
        
        // Check permission first
        const canAssignRoles = await User.hasPermission(currentUser.id, 'user_role_assign');
        if (!canAssignRoles) {
          errors.role_id = ['You do not have permission to assign user roles'];
        } else {
          // Check if user can assign this role based on permissions
          const canAssign = await PermissionHelper.canAssignRole(currentUser.id, role_id);
          if (!canAssign) {
            errors.role_id = ['You cannot assign a role with permissions you do not have'];
          }
        }
      }
    }

    // Validate status
    const validStatuses = ['active', 'disabled', 'blocked'];
    if (status && !validStatuses.includes(status)) {
      errors.status = ['Invalid status. Must be active, disabled, or blocked'];
    }

    if (Object.keys(errors).length > 0) {
      return c.json(
        apiResponse.validation(errors),
        400
      );
    }

    // Check if user already exists
    const existingUser = await User.findByIdentity(email);
    if (existingUser) {
      return c.json(
        apiResponse.validation({
          email: ['Email already exists']
        }),
        400
      );
    }

    // Hash password
    const pepper = process.env.APPLICATION_SECRET;
    if (!pepper) {
      console.error('🔴 SECURITY WARNING: APPLICATION_SECRET not set!');
      return c.json(apiResponse.error('Server configuration error'), 500);
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password + pepper, saltRounds);

    // Create user with atomic transaction
    const userId = await db.transaction(async (trx) => {
      // Generate username from email
      const emailPrefix = email.split('@')[0].toLowerCase();
      const username = emailPrefix.replace(/[^a-zA-Z0-9]/g, '') || 'user';
      
      const userData = {
        name: security.sanitizeInput(name),
        username: username,
        email: security.sanitizeInput(email.toLowerCase()),
        password_hash: hashedPassword,
        role_id,
        status
      };

      // Create user within transaction
      await trx('users').insert(userData);
      
      // Get the created user by email (unique identifier)
      const createdUser = await trx('users').where('email', userData.email).first();
      if (!createdUser) {
        throw new Error('Failed to create user');
      }
      
      return createdUser.id;
    });
    
    const newUser = await User.findById(userId);

    return c.json(
      apiResponse.success({
        user: newUser.toJSON()
      }, 'User created successfully'),
      201
    );

  } catch (error) {
    console.error('Create user error:', error);
    return c.json(
      apiResponse.error('Failed to create user'),
      500
    );
  }
});

/**
 * PUT /api/users/:id - Update user
 */
users.put('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const { name, email, role_id, status, password } = await c.req.json();
    const { user: currentUser } = getAuthData(c);

    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return c.json(
        apiResponse.validation({ id: ['Invalid user ID'] }),
        400
      );
    }

    // Find user to update
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }

    // Determine if this is a profile edit (only name, email, password) or admin edit (role/status)
    const isAdminEdit = role_id !== undefined || status !== undefined;
    const isProfileEdit = !isAdminEdit;
    const isSelfEdit = userId === currentUser.id;

    // Check permissions based on edit type
    if (isSelfEdit && isAdminEdit) {
      // Block self role/status changes
      return c.json(
        apiResponse.forbidden('Cannot change your own role or status'),
        403
      );
    }
    
    if (!isSelfEdit) {
      // For editing other users, check permission superset
      const canManage = await PermissionHelper.canManageUser(currentUser.id, userId);
      if (!canManage) {
        return c.json(
          apiResponse.forbidden('You cannot edit users with more permissions than your own'),
          403
        );
      }
    }

    const errors = {};
    const updateData = {};

    // Validate name if provided
    if (name !== undefined) {
      if (!name) {
        errors.name = ['Name is required'];
      } else if (!security.isValidName(name)) {
        errors.name = ['Invalid name format (2-50 characters, letters, spaces, hyphens and apostrophes only)'];
      } else {
        updateData.name = security.sanitizeInput(name);
      }
    }

    // Validate email if provided
    if (email !== undefined) {
      if (!email) {
        errors.email = ['Email is required'];
      } else if (!security.isValidEmail(email)) {
        errors.email = ['Invalid email format'];
      } else {
        const sanitizedEmail = security.sanitizeInput(email.toLowerCase());
        // Check if email is already taken by another user
        if (sanitizedEmail !== userToUpdate.email) {
          const existingUser = await User.findByIdentity(sanitizedEmail);
          if (existingUser && existingUser.id !== userId) {
            errors.email = ['Email already exists'];
          } else {
            updateData.email = sanitizedEmail;
          }
        }
      }
    }

    // Validate role_id if provided
    if (role_id !== undefined) {
      if (role_id) {
        const Role = (await import('../models/Role.js')).Role;
        const roleExists = await Role.findById(role_id);
        if (!roleExists) {
          errors.role_id = ['Invalid role ID'];
        } else {
          // Check if current user can assign this role (skip for self-edit keeping same role)
          const isSelfEditSameRole = userId === currentUser.id && role_id === userToUpdate.role_id;
          
          if (!isSelfEditSameRole) {
            // Check if user has permission to assign roles
            const canAssignRoles = await User.hasPermission(currentUser.id, 'user_role_assign');
            if (!canAssignRoles) {
              errors.role_id = ['You do not have permission to assign user roles'];
            } else {
              // Check if user can assign this role based on permissions
              const canAssign = await PermissionHelper.canAssignRole(currentUser.id, role_id);
              if (!canAssign) {
                errors.role_id = ['You cannot assign a role with permissions you do not have'];
              } else {
                updateData.role_id = role_id;
              }
            }
          } else {
            // Self-edit with same role - no validation needed
            updateData.role_id = role_id;
          }
        }
      } else {
        errors.role_id = ['Role is required - cannot remove role'];
      }
    }

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ['active', 'disabled', 'blocked'];
      if (!validStatuses.includes(status)) {
        errors.status = ['Invalid status'];
      } else {
        updateData.status = status;
      }
    }

    // Validate password if provided
    if (password !== undefined) {
      if (!password) {
        errors.password = ['Password cannot be empty'];
      } else {
        const passwordValidation = security.validatePassword(password);
        if (!passwordValidation.isValid) {
          errors.password = passwordValidation.errors;
        } else {
          // Hash new password
          const pepper = process.env.APPLICATION_SECRET;
          if (!pepper) {
            console.error('🔴 SECURITY WARNING: APPLICATION_SECRET not set!');
            return c.json(apiResponse.error('Server configuration error'), 500);
          }

          const saltRounds = 12;
          updateData.password_hash = await bcrypt.hash(password + pepper, saltRounds);
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return c.json(
        apiResponse.validation(errors),
        400
      );
    }

    if (Object.keys(updateData).length === 0) {
      return c.json(
        apiResponse.validation({
          update: ['No valid fields to update']
        }),
        400
      );
    }

    // Update user
    await User.update(userId, updateData);
    const updatedUser = await User.findById(userId);

    return c.json(
      apiResponse.success({
        user: updatedUser.toJSON()
      }, 'User updated successfully'),
      200
    );

  } catch (error) {
    console.error('Update user error:', error);
    return c.json(
      apiResponse.error('Failed to update user'),
      500
    );
  }
});

/**
 * GET /api/users/:id/permissions - Get user permissions (role + direct)
 * Requires user_permissions_view permission + hierarchical validation
 */
users.get('/:id/permissions', requirePermission('user_permissions_view'), async (c) => {
  try {
    const userId = c.req.param('id');
    
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return c.json(
        apiResponse.validation({ id: ['Invalid user ID'] }),
        400
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }

    // Check if current user can manage target user (permission superset)
    const { user: currentUser } = getAuthData(c);
    const canManage = await PermissionHelper.canManageUser(currentUser.id, userId);
    if (!canManage) {
      return c.json(
        apiResponse.forbidden('You cannot view permissions of users with more permissions than your own'),
        403
      );
    }

    // Get all permissions with their source (role or direct)
    const allPermissions = await User.getPermissions(userId);
    
    // Get role permissions separately
    const rolePermissions = await User.getRolePermissions(userId);
    const directPermissions = await User.getDirectPermissions(userId);
    
    return c.json(
      apiResponse.success({
        permissions: allPermissions,
        rolePermissions: rolePermissions,
        directPermissions: directPermissions
      }, 'User permissions retrieved successfully'),
      200
    );

  } catch (error) {
    console.error('Get user permissions error:', error);
    return c.json(
      apiResponse.error('Failed to retrieve user permissions'),
      500
    );
  }
});

/**
 * PUT /api/users/:id/permissions - Update user direct permissions
 * Requires user_permissions_edit permission + hierarchical validation
 */
users.put('/:id/permissions', requirePermission('user_permissions_edit'), async (c) => {
  try {
    const userId = c.req.param('id');
    const { permissions = [] } = await c.req.json();
    
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return c.json(
        apiResponse.validation({ id: ['Invalid user ID'] }),
        400
      );
    }

    if (!Array.isArray(permissions)) {
      return c.json(
        apiResponse.validation({ permissions: ['Permissions must be an array'] }),
        400
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }

    // Check if current user can manage target user (permission superset)
    const { user: currentUser } = getAuthData(c);
    const canManage = await PermissionHelper.canManageUser(currentUser.id, userId);
    if (!canManage) {
      return c.json(
        apiResponse.forbidden('You cannot edit permissions of users with more permissions than your own'),
        403
      );
    }

    // Validate permission assignment
    const validation = await PermissionHelper.validatePermissionAssignment(currentUser.id, permissions);
    if (!validation.valid) {
      return c.json(
        apiResponse.validation({
          permissions: [validation.message]
        }),
        403
      );
    }
    
    // Additional check: Ensure the resulting permissions (role + direct) won't exceed actor's permissions
    const targetRolePermissions = await User.getRolePermissions(userId);
    const targetRolePermissionIds = new Set(targetRolePermissions.map(p => p.id));
    
    // Calculate what the target user's total permissions would be
    const totalTargetPermissionIds = new Set([
      ...targetRolePermissionIds,
      ...permissions
    ]);
    
    // Get actor's total permissions
    const actorPermissions = await User.getPermissions(currentUser.id);
    
    // Check if target would have equal or more permissions than actor
    if (totalTargetPermissionIds.size >= actorPermissions.length) {
      return c.json(
        apiResponse.validation({
          permissions: ['The resulting permissions would equal or exceed your own permissions']
        }),
        403
      );
    }
    
    // Check if target would have any permission that actor doesn't have
    const actorPermissionIds = new Set(actorPermissions.map(p => p.id));
    const hasUnauthorizedPermission = [...totalTargetPermissionIds].some(
      permId => !actorPermissionIds.has(permId)
    );
    
    if (hasUnauthorizedPermission) {
      return c.json(
        apiResponse.validation({
          permissions: ['The resulting permissions would include permissions you do not have']
        }),
        403
      );
    }

    // Note: We don't validate role permissions here since the frontend 
    // only sends direct permissions (excluding role permissions)

    // Get only the additional permissions (not covered by role)
    const rolePermissions = await User.getRolePermissions(userId);
    const rolePermissionIds = rolePermissions.map(p => p.id);
    const additionalPermissions = permissions.filter(permId => !rolePermissionIds.includes(permId));

    // Sync only the additional permissions
    await User.syncPermissions(userId, additionalPermissions);
    
    // Get updated permissions
    const updatedPermissions = await User.getPermissions(userId);
    const directPermissions = await User.getDirectPermissions(userId);

    return c.json(
      apiResponse.success({
        permissions: updatedPermissions,
        directPermissions: directPermissions
      }, 'User permissions updated successfully'),
      200
    );

  } catch (error) {
    console.error('Update user permissions error:', error);
    return c.json(
      apiResponse.error('Failed to update user permissions'),
      500
    );
  }
});

/**
 * DELETE /api/users/:id - Delete user
 */
users.delete('/:id', requirePermission('user_delete'), async (c) => {
  try {
    const userId = c.req.param('id');
    const { user: currentUser } = getAuthData(c);

    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return c.json(
        apiResponse.validation({ id: ['Invalid user ID'] }),
        400
      );
    }

    // Prevent admin from deleting themselves
    if (userId === currentUser.id) {
      return c.json(
        apiResponse.forbidden('Cannot delete your own account'),
        403
      );
    }

    // Find user to delete
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }

    // Check if current user can manage target user (permission superset)
    const canManage = await PermissionHelper.canManageUser(currentUser.id, userId);
    if (!canManage) {
      return c.json(
        apiResponse.forbidden('You cannot delete users with equal or more permissions than your own'),
        403
      );
    }

    // Only allow deletion of disabled users
    if (userToDelete.status !== 'disabled') {
      return c.json(
        apiResponse.forbidden('Only disabled users can be deleted. Please disable the user first.'),
        403
      );
    }

    // Delete user
    await User.delete(userId);

    return c.json(
      apiResponse.success(
        null,
        'User deleted successfully'
      ),
      200
    );

  } catch (error) {
    console.error('Delete user error:', error);
    return c.json(
      apiResponse.error('Failed to delete user'),
      500
    );
  }
});

/**
 * GET /api/users/:id/can-edit - Check if current user can edit target user
 * Used for modal permission validation
 */
users.get('/:id/can-edit', requirePermission('user_permissions_view'), async (c) => {
  try {
    const targetUserId = c.req.param('id');
    const currentUser = c.get('user');

    if (!security.validateInput(targetUserId, 'uuid')) {
      return c.json(apiResponse.error('Invalid user ID'), 400);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return c.json(apiResponse.error('User not found'), 404);
    }

    // Check if current user can manage target user
    const isSelf = currentUser.id === targetUserId;
    const canEdit = isSelf || await PermissionHelper.canManageUser(currentUser.id, targetUserId);
    
    // Check if target user has more permissions (for role dropdown disabling)
    // For self-edit, always disable role dropdown (can't change own role)
    const hasMorePermissions = isSelf || !await PermissionHelper.canManageUser(currentUser.id, targetUserId);
    const currentUserPermissions = await User.getPermissions(currentUser.id);
    const targetUserPermissions = await User.getPermissions(targetUserId);
    
    return c.json(
      apiResponse.success({
        can_edit: canEdit,
        has_more_permissions: hasMorePermissions,
        current_user_permission_count: currentUserPermissions.length,
        target_user_permission_count: targetUserPermissions.length
      }, 'Permission check completed'),
      200
    );

  } catch (error) {
    console.error('Check user edit permission error:', error);
    return c.json(
      apiResponse.error('Failed to check edit permissions'),
      500
    );
  }
});

export default users;