import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import UserNamespaceRole from '../models/UserNamespaceRole.js';
import { apiResponse } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { namespaceMiddleware, requireNamespace } from '../middleware/namespace.js';
import { getAuthData } from '../utils/authHelper.js';
import { security } from '../utils/security.js';
import { strictRateLimit } from '../middleware/rateLimiter.js';
import { PermissionHelper } from '../utils/permissionHelper.js';
import * as yup from 'yup';
import { validate, searchfield, oneOfWithEmpty } from '../utils/validate.js';
import { useNamespace } from '../utils/namespaceHelper.js';
import db from '../db.js';

const users = new Hono();

// Apply authentication middleware to all routes
users.use('*', authMiddleware);

// Apply namespace middleware to all routes
users.use('*', namespaceMiddleware);

// Apply rate limiting only to sensitive operations
users.use('/*/delete', strictRateLimit);
users.post('/', strictRateLimit); // Only for create operations

/**
 * GET /api/users - List users in current namespace with pagination and search
 */
users.get('/', requirePermission('user_index'), async (c) => {
  try {
    const currentNamespace = useNamespace(c);
    
    // Validate and sanitize query parameters
    const validation = await validate(c.req.query(), {
      page: yup.number().integer().min(1).max(1000).default(1),
      limit: yup.number().integer().min(1).max(100).default(10), 
      search: searchfield(100),
      status: oneOfWithEmpty('active', 'disabled', 'blocked'),
      sortBy: yup.string().default('created_at').oneOf(['id', 'name', 'email', 'status', 'created_at', 'updated_at', 'role_name']),
      sortOrder: yup.string().default('desc').oneOf(['asc', 'desc'])
    });

    if (!validation.isValid) {
      return c.json(apiResponse.validation(validation.errors), 400);
    }

    const { page, limit, search, status, sortBy, sortOrder } = validation.valid;
    const offset = (page - 1) * limit;
    const { user: currentUser } = getAuthData(c);

    const limitedUsersQuery = db('users')
      .leftJoin('user_namespace_roles', function() {
        this.on('users.id', '=', 'user_namespace_roles.user_id')
            .andOn('user_namespace_roles.namespace_id', '=', db.raw('?', [currentNamespace.id]));
      })
      .leftJoin('roles', 'user_namespace_roles.role_id', 'roles.id')
      .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
      .modify((qb) => {
        if (search?.trim()) {
          const safeTerm = `%${search}%`;
          qb.andWhere(function() {
            this.where('users.name', 'like', safeTerm)
              .orWhere('users.email', 'like', safeTerm)
              .orWhere('users.username', 'like', safeTerm);
          });
        }
      })
      .modify((qb) => {
        if (status) qb.andWhere('users.status', status);
      })
      .groupBy(
        'users.id',
        'users.name',
        'users.username',
        'users.email',
        'users.password_hash',
        'users.status',
        'users.created_at',
        'users.updated_at',
        'roles.id',
        'roles.name',
        'roles.display_name',
        'user_namespace_roles.created_at'
      )
      .select(
        'users.*',
        'roles.id as role_id',
        'roles.name as role_name',
        'roles.display_name as role_display_name',
        'user_namespace_roles.created_at as assigned_at',
        db.raw('COUNT(DISTINCT role_permissions.permission_id) as number_of_permissions')
      )
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    const countQuery = db('users')
      .leftJoin('user_namespace_roles', function() {
        this.on('users.id', '=', 'user_namespace_roles.user_id')
            .andOn('user_namespace_roles.namespace_id', '=', db.raw('?', [currentNamespace.id]));
      })
      .modify((qb) => {
        if (search?.trim()) {
          const safeTerm = `%${search}%`;
          qb.andWhere(function() {
            this.where('users.name', 'like', safeTerm)
              .orWhere('users.email', 'like', safeTerm)
              .orWhere('users.username', 'like', safeTerm);
          });
        }
      })
      .modify((qb) => {
        if (status) qb.andWhere('users.status', status);
      })
      .count('* as total');

    const [{ total }] = await countQuery;

    const usersWithCanEdit = await db
      .with('limited_users', limitedUsersQuery)
      .with('current_user_permissions', qb =>
        qb.select('rp.permission_id')
          .from('user_namespace_roles as unr')
          .join('role_permissions as rp', 'rp.role_id', 'unr.role_id')
          .where('unr.user_id', currentUser.id)
          .andWhere('unr.namespace_id', currentNamespace.id)
          .distinct()
      )
      .with('target_user_permissions', qb =>
        qb.select('unr.user_id', 'rp.permission_id')
          .from('user_namespace_roles as unr')
          .join('role_permissions as rp', 'rp.role_id', 'unr.role_id')
          .where('unr.namespace_id', currentNamespace.id)
          .whereIn('unr.user_id', db.select('id').from('limited_users'))
      )
      .with('target_user_perm_counts', qb =>
        qb.select('user_id')
          .countDistinct({ perm_count: 'permission_id' })
          .from('target_user_permissions')
          .groupBy('user_id')
      )
      .with('current_user_perm_count', qb =>
        qb.select(db.raw('COUNT(DISTINCT permission_id) as perm_count'))
          .from('current_user_permissions')
      )
      .with('missing_permission_counts', qb =>
        qb.select('tup.user_id')
          .count('* as missing_permissions')
          .from(db.select('user_id', 'permission_id').from('target_user_permissions').as('tup'))
          .leftJoin('current_user_permissions as cup', 'tup.permission_id', 'cup.permission_id')
          .whereNull('cup.permission_id')
          .groupBy('tup.user_id')
      )
      .select(
        'limited_users.*',
        db.raw(`
          CASE
            WHEN limited_users.id = ? THEN 1
            WHEN COALESCE(missing_permission_counts.missing_permissions, 0) = 0
              AND target_user_perm_counts.perm_count < (SELECT perm_count FROM current_user_perm_count)
            THEN 1
            ELSE 0
          END as can_edit
        `, [currentUser.id])
      )
      .from('limited_users')
      .leftJoin('target_user_perm_counts', 'limited_users.id', 'target_user_perm_counts.user_id')
      .leftJoin('missing_permission_counts', 'limited_users.id', 'missing_permission_counts.user_id')
      .orderBy([{ column: sortBy, order: sortOrder }, { column: 'id', order: 'asc' }]);

    const totalPages = Math.ceil(total / limit);

    return c.json(
      apiResponse.success({
        users: usersWithCanEdit.map(user => ({
          ...new User(user).toJSON(),
          role_id: user.role_id,
          role_name: user.role_name,
          role_display_name: user.role_display_name,
          assigned_at: user.assigned_at,
          number_of_permissions: parseInt(user.number_of_permissions) || 0,
          can_edit: Boolean(user.can_edit)
        })),
        namespace: {
          id: currentNamespace.id,
          name: currentNamespace.name,
          full_path: currentNamespace.full_path
        },
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }, 'Users retrieved successfully'),
      200
    );
  } catch (error) {
    console.error('List users error:', error);
    return c.json(apiResponse.error('Failed to retrieve users'), 500);
  }
});

/**
 * GET /api/users/:id - Get single user (namespace-aware)
 */
users.get('/:userId', requirePermission('user_show'), async (c) => {
  try {
    const currentNamespace = useNamespace(c);
    const { user: currentUser } = getAuthData(c);
    
    // Validate path parameters
    const validation = await validate(c.req.param(), {
      userId: yup.string().required().min(10).matches(/^[0-9a-f-]+$/i, 'Must be a valid UUID')
    });

    if (!validation.isValid) {
      return c.json(apiResponse.validation(validation.errors), 400);
    }

    const { userId } = validation.valid;

    // Get user with role in current namespace (single query with JOIN)
    const userWithRole = await db('users')
      .join('user_namespace_roles', 'users.id', 'user_namespace_roles.user_id')
      .join('roles', 'user_namespace_roles.role_id', 'roles.id')
      .where('users.id', userId)
      .andWhere('user_namespace_roles.namespace_id', currentNamespace.id)
      .select(
        'users.*',
        'roles.id as role_id',
        'roles.name as role_name',
        'roles.display_name as role_display_name',
        'user_namespace_roles.created_at as assigned_at'
      )
      .first();

    if (!userWithRole) {
      return c.json(
        apiResponse.error('User not found in this namespace'),
        404
      );
    }

    // Check if current user can view this target user (permission hierarchy)
    if (userId !== currentUser.id) {
      const canManage = await PermissionHelper.canManageUserInNamespace(currentUser.id, userId, currentNamespace.id);
      if (!canManage) {
        return c.json(
          apiResponse.forbidden('You cannot view users with equal or more permissions than your own in this namespace'),
          403
        );
      }
    }

    return c.json(
      apiResponse.success({
        user: {
          ...new User(userWithRole).toJSON(),
          role_id: userWithRole.role_id,
          role_name: userWithRole.role_name,
          role_display_name: userWithRole.role_display_name,
          assigned_at: userWithRole.assigned_at
        },
        namespace: {
          id: currentNamespace.id,
          name: currentNamespace.name,
          full_path: currentNamespace.full_path
        }
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
 * POST /api/users - Create new user and assign to current namespace
 */
users.post('/', requirePermission('user_create'), async (c) => {
  try {
    const currentNamespace = useNamespace(c);
    const { user: currentUser } = getAuthData(c);
    const requestBody = await c.req.json();
    
    // Validate request body with Yup
    const validation = await validate(requestBody, {
      name: yup.string().required().test('valid-name', 'Invalid name format', value => security.isValidName(value)),
      username: yup.string().required().test('valid-username', 'Invalid username format', value => security.isValidUsername(value)),
      email: yup.string().required().test('valid-email', 'Invalid email format', value => security.isValidEmail(value)),
      password: yup.string().required().test('valid-password', function(value) {
        const validation = security.validatePassword(value);
        if (!validation.isValid) {
          return this.createError({ message: validation.errors.join(', ') });
        }
        return true;
      }),
      role_id: yup.string().required().test('role-validation', 'Role validation failed', async function(value) {
        try {
          // Check if role exists in current namespace
          const Role = (await import('../models/Role.js')).Role;
          const availableRoles = await Role.getAvailableInNamespace(currentNamespace.id);
          const roleExists = availableRoles.find(r => r.id === value);
          
          if (!roleExists) {
            return this.createError({ message: 'Role not available in this namespace' });
          }

          // Check if current user can assign this role
          const canAssignRoles = await User.hasPermissionInNamespace(currentUser.id, 'user_role_assign', currentNamespace.id);
          if (!canAssignRoles) {
            return this.createError({ message: 'You do not have permission to assign user roles' });
          }

          const canAssign = await PermissionHelper.canAssignRoleInNamespace(currentUser.id, value, currentNamespace.id);
          if (!canAssign) {
            return this.createError({ message: 'You cannot assign a role with permissions you do not have' });
          }

          return true;
        } catch (error) {
          console.error('Role validation error:', error);
          return this.createError({ message: 'Role validation failed' });
        }
      }),
      status: yup.string().default('active').oneOf(['active', 'disabled', 'blocked'])
    });

    if (!validation.isValid) {
      return c.json(apiResponse.validation(validation.errors), 400);
    }

    const { name, username, email, password, role_id, status } = validation.valid;

    // Create user and assign to namespace in transaction (prevents race conditions)
    const result = await db.transaction(async (trx) => {
      // Generate UUID v7 for new user
      const { v7: uuidv7 } = await import('uuid');
      const userId = uuidv7();
      
      // Check for duplicates within transaction (prevents race conditions)
      const existingUserByEmail = await trx('users').where('email', email.toLowerCase()).first();
      if (existingUserByEmail) {
        throw new Error('EMAIL_EXISTS');
      }

      const existingUserByUsername = await trx('users').where('username', username.toLowerCase()).first();
      if (existingUserByUsername) {
        throw new Error('USERNAME_EXISTS');
      }
      
      // Hash password with pepper
      const pepper = process.env.APPLICATION_SECRET;
      if (!pepper) {
        throw new Error('APPLICATION_SECRET not configured');
      }
      const hashedPassword = await bcrypt.hash(password + pepper, 12);
      
      // Sanitize inputs (after validation to ensure clean data)
      const userData = {
        id: userId,
        name: security.sanitizeInput(name),
        username: security.sanitizeInput(username.toLowerCase()),
        email: security.sanitizeInput(email.toLowerCase()),
        password_hash: hashedPassword,
        role_id: null,
        status
      };

      await trx('users').insert(userData);
      
      // Assign user to current namespace with specified role
      await trx('user_namespace_roles').insert({
        user_id: userId,
        namespace_id: currentNamespace.id,
        role_id: role_id,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return userId;
    });
    
    const newUser = await User.findById(result);
    const userRole = await UserNamespaceRole.getRoleForUser(result, currentNamespace.id);

    return c.json(
      apiResponse.success({
        user: {
          ...newUser.toJSON(),
          role_id: userRole?.id,
          role_name: userRole?.name,
          role_display_name: userRole?.display_name
        },
        namespace: {
          id: currentNamespace.id,
          name: currentNamespace.name
        }
      }, 'User created successfully'),
      201
    );

  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle specific validation errors
    if (error.message === 'EMAIL_EXISTS') {
      return c.json(
        apiResponse.validation({ email: ['Email already exists'] }),
        400
      );
    }
    
    if (error.message === 'USERNAME_EXISTS') {
      return c.json(
        apiResponse.validation({ username: ['Username already exists'] }),
        400
      );
    }
    
    if (error.message === 'APPLICATION_SECRET not configured') {
      return c.json(
        apiResponse.error('Server configuration error'),
        500
      );
    }
    
    return c.json(
      apiResponse.error('Failed to create user'),
      500
    );
  }
});

/**
 * PUT /api/users/:id - Update user in current namespace
 */
users.put('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const currentNamespace = useNamespace(c);
    const { user: currentUser } = getAuthData(c);
    const { name, email, username, role_id, status, password } = await c.req.json();

    // Block username changes only if it's actually being changed
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }


    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return c.json(
        apiResponse.validation({ id: ['Invalid user ID'] }),
        400
      );
    }

    // Check if user exists in current namespace
    const userInNamespace = await UserNamespaceRole.findByUserAndNamespace(userId, currentNamespace.id);
    if (!userInNamespace) {
      return c.json(
        apiResponse.error('User not found in this namespace'),
        404
      );
    }

    // Permission checks
    const isSelfEdit = userId === currentUser.id;
    
    // For self-editing, ignore role_id and status changes (treat as undefined)
    let effectiveRoleId = role_id;
    let effectiveStatus = status;
    
    if (isSelfEdit) {
      // Get current user's role and status to check if they're actually trying to change it
      const currentRole = await UserNamespaceRole.getRoleForUser(userId, currentNamespace.id);
      
      // For self-edit, always ignore role and status changes (treat as no change)
      effectiveRoleId = undefined; // Never allow role changes for self-edit
      effectiveStatus = undefined; // Never allow status changes for self-edit
    }
    
    const isAdminEdit = effectiveRoleId !== undefined || effectiveStatus !== undefined;
    const isProfileEdit = !isAdminEdit;
    
    if (!isSelfEdit) {
      const canManage = await PermissionHelper.canManageUserInNamespace(currentUser.id, userId, currentNamespace.id);
      if (!canManage) {
        return c.json(
          apiResponse.forbidden('You cannot edit users with more permissions than your own in this namespace'),
          403
        );
      }
    }

    const errors = {};
    const updateData = {};

    // Validate basic fields (name, email, password)
    if (name !== undefined) {
      if (!name) {
        errors.name = ['Name is required'];
      } else if (!security.isValidName(name)) {
        errors.name = ['Invalid name format'];
      } else {
        updateData.name = security.sanitizeInput(name);
      }
    }


    if (email !== undefined) {
      if (!email) {
        errors.email = ['Email is required'];
      } else if (!security.isValidEmail(email)) {
        errors.email = ['Invalid email format'];
      } else {
        const sanitizedEmail = security.sanitizeInput(email.toLowerCase());
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

    if (password !== undefined) {
      if (!password) {
        errors.password = ['Password cannot be empty'];
      } else {
        const passwordValidation = security.validatePassword(password);
        if (!passwordValidation.isValid) {
          errors.password = passwordValidation.errors;
        } else {
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

    // Handle namespace-specific updates
    const namespaceUpdateData = {};

    // Validate role_id if provided (namespace-specific)
    console.log('DEBUG: effectiveRoleId =', effectiveRoleId, 'original role_id =', role_id);
    if (effectiveRoleId !== undefined) {
      if (effectiveRoleId === null) {
        // Explicitly setting role_id to null (unassign role)
        // This requires permission check but no role validation
        const canAssignRoles = await User.hasPermissionInNamespace(currentUser.id, 'user_role_assign', currentNamespace.id);
        if (!canAssignRoles) {
          errors.role_id = ['You do not have permission to assign user roles'];
        } else {
          namespaceUpdateData.role_id = null;
        }
      } else if (effectiveRoleId) {
        // Assigning a specific role
        const Role = (await import('../models/Role.js')).Role;
        const availableRoles = await Role.getAvailableInNamespace(currentNamespace.id);
        const roleExists = availableRoles.find(r => r.id === effectiveRoleId);
        
        if (!roleExists) {
          errors.role_id = ['Role not available in this namespace'];
        } else {
          const canAssignRoles = await User.hasPermissionInNamespace(currentUser.id, 'user_role_assign', currentNamespace.id);
          if (!canAssignRoles) {
            errors.role_id = ['You do not have permission to assign user roles'];
          } else {
            const canAssign = await PermissionHelper.canAssignRoleInNamespace(currentUser.id, effectiveRoleId, currentNamespace.id);
            if (!canAssign) {
              errors.role_id = ['You cannot assign a role with permissions you do not have'];
            } else {
              namespaceUpdateData.role_id = effectiveRoleId;
            }
          }
        }
      } else {
        // effectiveRoleId is empty string or other falsy value (but not null or undefined)
        errors.role_id = ['Role is required'];
      }
    }

    // Validate status if provided
    if (effectiveStatus !== undefined) {
      const validStatuses = ['active', 'disabled', 'blocked'];
      if (!validStatuses.includes(effectiveStatus)) {
        errors.status = ['Invalid status'];
      } else {
        updateData.status = effectiveStatus;
      }
    }

    if (Object.keys(errors).length > 0) {
      return c.json(
        apiResponse.validation(errors),
        400
      );
    }

    // Update user and namespace-specific data in transaction
    await db.transaction(async (trx) => {
      // Update basic user data if there are changes
      if (Object.keys(updateData).length > 0) {
        await trx('users').where('id', userId).update({
          ...updateData,
          updated_at: new Date()
        });
      }

      // Update namespace-specific role if changed
      if ('role_id' in namespaceUpdateData) {
        console.log('DEBUG: Updating role for user', userId, 'in namespace', currentNamespace.id, 'to role', namespaceUpdateData.role_id);
        
        // Check if user already has a role assignment in this namespace
        const existingAssignment = await trx('user_namespace_roles')
          .where({ user_id: userId, namespace_id: currentNamespace.id })
          .first();
          
        console.log('DEBUG: Existing assignment:', existingAssignment);
          
        if (existingAssignment) {
          // Update existing assignment
          console.log('DEBUG: Updating existing assignment');
          await trx('user_namespace_roles')
            .where({ user_id: userId, namespace_id: currentNamespace.id })
            .update({
              role_id: namespaceUpdateData.role_id,
              updated_at: new Date()
            });
        } else {
          // Insert new assignment
          console.log('DEBUG: Inserting new assignment');
          await trx('user_namespace_roles').insert({
            user_id: userId,
            namespace_id: currentNamespace.id,
            role_id: namespaceUpdateData.role_id,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    });

    const updatedUser = await User.findById(userId);
    const userRole = await UserNamespaceRole.getRoleForUser(userId, currentNamespace.id);

    return c.json(
      apiResponse.success({
        user: {
          ...updatedUser.toJSON(),
          role_id: userRole?.id,
          role_name: userRole?.name,
          role_display_name: userRole?.display_name
        },
        namespace: {
          id: currentNamespace.id,
          name: currentNamespace.name
        }
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
 * DELETE /api/users/:id - Remove user from current namespace
 */
users.delete('/:id', requirePermission('user_delete'), async (c) => {
  try {
    const userId = c.req.param('id');
    const currentNamespace = useNamespace(c);
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

    // Check if user exists in current namespace
    const userInNamespace = await UserNamespaceRole.findByUserAndNamespace(userId, currentNamespace.id);
    if (!userInNamespace) {
      return c.json(
        apiResponse.error('User not found in this namespace'),
        404
      );
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }

    // Check if current user can manage target user in this namespace
    const canManage = await PermissionHelper.canManageUserInNamespace(currentUser.id, userId, currentNamespace.id);
    if (!canManage) {
      return c.json(
        apiResponse.forbidden('You cannot delete users with equal or more permissions than your own in this namespace'),
        403
      );
    }

    // Remove user from current namespace (not global deletion)
    await UserNamespaceRole.delete(userId, currentNamespace.id);

    return c.json(
      apiResponse.success(
        null,
        'User removed from namespace successfully'
      ),
      200
    );

  } catch (error) {
    console.error('Delete user error:', error);
    return c.json(
      apiResponse.error('Failed to remove user from namespace'),
      500
    );
  }
});

/**
 * GET /api/users/:id/permissions - Get user permissions in current namespace
 */
users.get('/:id/permissions', requirePermission('user_permissions_view'), async (c) => {
  try {
    const userId = c.req.param('id');
    const currentNamespace = useNamespace(c);
    
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return c.json(
        apiResponse.validation({ id: ['Invalid user ID'] }),
        400
      );
    }

    // Check if user exists in current namespace
    const userInNamespace = await UserNamespaceRole.findByUserAndNamespace(userId, currentNamespace.id);
    if (!userInNamespace) {
      return c.json(
        apiResponse.error('User not found in this namespace'),
        404
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }

    // Check if current user can manage target user in this namespace
    const { user: currentUser } = getAuthData(c);
    const canManage = await PermissionHelper.canManageUserInNamespace(currentUser.id, userId, currentNamespace.id);
    if (!canManage) {
      return c.json(
        apiResponse.forbidden('You cannot view permissions of users with more permissions than your own in this namespace'),
        403
      );
    }

    // Get user's permissions in current namespace (role-based only)
    const userRole = await UserNamespaceRole.getRoleForUser(userId, currentNamespace.id);
    let permissions = [];
    
    if (userRole) {
      permissions = await db('permissions')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .where('role_permissions.role_id', userRole.id)
        .select('permissions.*');
    }
    
    return c.json(
      apiResponse.success({
        permissions: permissions,
        role: userRole,
        namespace: {
          id: currentNamespace.id,
          name: currentNamespace.name
        }
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
 * POST /api/users/:id/assign-to-namespace - Assign existing user to namespace
 */
users.post('/:id/assign-to-namespace', requirePermission('user_create'), async (c) => {
  try {
    const userId = c.req.param('id');
    const currentNamespace = useNamespace(c);
    const { user: currentUser } = getAuthData(c);
    const { role_id } = await c.req.json();

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

    // Check if user is already in this namespace
    const existingAssignment = await UserNamespaceRole.exists(userId, currentNamespace.id);
    if (existingAssignment) {
      return c.json(
        apiResponse.validation({
          user: ['User is already assigned to this namespace']
        }),
        400
      );
    }

    // Validate role
    if (!role_id) {
      return c.json(
        apiResponse.validation({ role_id: ['Role is required'] }),
        400
      );
    }

    const Role = (await import('../models/Role.js')).Role;
    const availableRoles = await Role.getAvailableInNamespace(currentNamespace.id);
    const roleExists = availableRoles.find(r => r.id === role_id);
    
    if (!roleExists) {
      return c.json(
        apiResponse.validation({ role_id: ['Role not available in this namespace'] }),
        400
      );
    }

    // Check permissions
    const canAssignRoles = await User.hasPermissionInNamespace(currentUser.id, 'user_role_assign', currentNamespace.id);
    if (!canAssignRoles) {
      return c.json(
        apiResponse.forbidden('You do not have permission to assign user roles'),
        403
      );
    }

    const canAssign = await PermissionHelper.canAssignRoleInNamespace(currentUser.id, role_id, currentNamespace.id);
    if (!canAssign) {
      return c.json(
        apiResponse.forbidden('You cannot assign a role with permissions you do not have'),
        403
      );
    }

    // Assign user to namespace
    await UserNamespaceRole.create(userId, currentNamespace.id, role_id);

    const userRole = await UserNamespaceRole.getRoleForUser(userId, currentNamespace.id);

    return c.json(
      apiResponse.success({
        user: {
          ...user.toJSON(),
          role_id: userRole?.id,
          role_name: userRole?.name,
          role_display_name: userRole?.display_name
        },
        namespace: {
          id: currentNamespace.id,
          name: currentNamespace.name
        }
      }, 'User assigned to namespace successfully'),
      201
    );

  } catch (error) {
    console.error('Assign user to namespace error:', error);
    return c.json(
      apiResponse.error('Failed to assign user to namespace'),
      500
    );
  }
});

export default users;