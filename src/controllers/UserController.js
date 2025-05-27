import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { apiResponse } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { getAuthData } from '../utils/authHelper.js';
import { security } from '../utils/security.js';
import { strictRateLimit } from '../middleware/rateLimiter.js';

const users = new Hono();

// Apply authentication middleware to all routes
users.use('*', authMiddleware);

// Apply rate limiting only to sensitive operations
users.use('/*/delete', strictRateLimit);
users.post('/', strictRateLimit); // Only for create operations

// Apply permission checks to specific routes
users.get('/', requirePermission('user_manage'));
users.get('/:id', requirePermission('user_manage'));
users.post('/', requirePermission('user_create'));
users.put('/:id', requirePermission('user_manage'));
users.delete('/:id', requirePermission('user_delete'));

/**
 * GET /api/users - List users with pagination and search
 */
users.get('/', async (c) => {
  try {
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

    return c.json(
      apiResponse.success({
        users: result.data.map(user => user.toJSON()),
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
    const { name, email, password, role_id, status = 'active' } = await c.req.json();

    // Validate required fields
    const errors = {};
    
    if (!name) {
      errors.name = ['Name is required'];
    } else if (!security.isValidUsername(name)) {
      errors.name = ['Invalid name format (3-30 characters, alphanumeric, underscore, dash only)'];
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

    // Validate role_id
    if (role_id) {
      const Role = (await import('../models/Role.js')).Role;
      const roleExists = await Role.findById(role_id);
      if (!roleExists) {
        errors.role_id = ['Invalid role ID'];
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

    // Create user
    const userData = {
      name: security.sanitizeInput(name),
      email: security.sanitizeInput(email.toLowerCase()),
      password_hash: hashedPassword,
      role_id,
      status
    };

    const userId = await User.create(userData);
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

    // Prevent admin from changing their own role/status
    if (userId === currentUser.id && (role_id !== undefined || status !== undefined)) {
      return c.json(
        apiResponse.forbidden('Cannot change your own role or status'),
        403
      );
    }

    const errors = {};
    const updateData = {};

    // Validate name if provided
    if (name !== undefined) {
      if (!name) {
        errors.name = ['Name is required'];
      } else if (!security.isValidUsername(name)) {
        errors.name = ['Invalid name format'];
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
          updateData.role_id = role_id;
        }
      } else {
        updateData.role_id = null;
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
 * DELETE /api/users/:id - Delete user
 */
users.delete('/:id', async (c) => {
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

export default users;