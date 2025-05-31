import { Hono } from 'hono';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import User from '../models/User.js';
import { apiResponse } from '../utils/response.js';
import { security } from '../utils/security.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { namespaceMiddleware, requireNamespace } from '../middleware/namespace.js';
import { PermissionHelper } from '../utils/permissionHelper.js';

const roleController = new Hono();

roleController.use('*', authMiddleware);
roleController.use('*', namespaceMiddleware);

/**
 * GET /api/roles/assignable - Get roles that current user can assign to others in current namespace
 * Different from general list - only returns roles with permission subset logic
 */
roleController.get('/assignable', requirePermission('user_role_assign'), async (c) => {
    try {
        const currentUser = c.get('user');
        const currentNamespace = c.get('currentNamespace');
        const assignableRoles = await PermissionHelper.getAssignableRolesInNamespace(currentUser.id, currentNamespace.id);
        
        return c.json(
            apiResponse.success({ 
                roles: assignableRoles,
                namespace: {
                    id: currentNamespace.id,
                    name: currentNamespace.name,
                    full_path: currentNamespace.full_path
                }
            }, 'Assignable roles retrieved successfully'),
            200
        );
    } catch (error) {
        console.error('Get assignable roles error:', error);
        return c.json(apiResponse.error('Failed to retrieve assignable roles'), 500);
    }
});

roleController.get('/', requirePermission('roles_list'), async (c) => {
    try {
        const page = Math.max(1, parseInt(c.req.query('page')) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit')) || 10));
        const search = security.sanitizeInput(c.req.query('search') || '');
        const currentNamespace = c.get('currentNamespace');
        
        const result = await Role.paginate({ page, limit, search });
        
        // Load permissions and user count for each role
        for (const role of result.data) {
            role.permissions = await Role.getPermissions(role.id);
            role.user_count = await Role.getUserCount(role.id, currentNamespace.id);
        }
        
        return c.json(apiResponse.success(result, 'Roles retrieved successfully'));
    } catch (error) {
        console.error('Get roles error:', error);
        return c.json(apiResponse.error('Failed to retrieve roles'), 500);
    }
});

roleController.get('/:id', requirePermission('roles_list'), async (c) => {
    try {
        const id = c.req.param('id');
        
        if (!security.validateInput(id, 'uuid')) {
            return c.json(apiResponse.error('Invalid role ID'), 400);
        }

        const role = await Role.findById(id);
        if (!role) {
            return c.json(apiResponse.error('Role not found'), 404);
        }

        const permissions = await Role.getPermissions(id);
        
        return c.json(apiResponse.success({
            ...role,
            permissions
        }, 'Role retrieved successfully'));
    } catch (error) {
        console.error('Get role error:', error);
        return c.json(apiResponse.error( 'Failed to retrieve role'), 500);
    }
});

roleController.post('/', requirePermission('roles_create'), async (c) => {
    try {
        const { name, display_name, description, permissions } = await c.req.json();

        if (!name || !security.validateInput(name, 'alphanumeric_underscore')) {
            return c.json(apiResponse.error( 'Invalid role name'), 400);
        }

        if (!display_name || !security.validateInput(display_name, 'text')) {
            return c.json(apiResponse.error( 'Invalid display name'), 400);
        }

        const existingRole = await Role.findByName(name);
        if (existingRole) {
            return c.json(apiResponse.error( 'Role name already exists'), 409);
        }

        const roleData = {
            name: security.sanitizeInput(name),
            display_name: security.sanitizeInput(display_name),
            description: description ? security.sanitizeInput(description) : null,
            is_system: false
        };

        const role = await Role.create(roleData);
        
        // Assign permissions if provided
        if (permissions && Array.isArray(permissions) && permissions.length > 0) {
            // Validate that all permission IDs are valid UUIDs
            for (const permissionId of permissions) {
                if (!security.validateInput(permissionId, 'uuid')) {
                    return c.json(apiResponse.error('Invalid permission ID'), 400);
                }
            }
            
            // Check if user has all the permissions they're trying to assign
            const currentUser = c.get('user');
            const userPermissions = await User.getPermissions(currentUser.id);
            const userPermissionIds = userPermissions.map(p => p.id);
            
            for (const permissionId of permissions) {
                if (!userPermissionIds.includes(permissionId)) {
                    return c.json(apiResponse.error('You cannot assign permissions you do not have'), 403);
                }
            }
            
            await Role.syncPermissions(role.id, permissions);
        }
        
        return c.json(apiResponse.success(role, 'Role created successfully'), 201);
    } catch (error) {
        console.error('Create role error:', error);
        return c.json(apiResponse.error( 'Failed to create role'), 500);
    }
});

roleController.put('/:id', requirePermission('roles_edit'), async (c) => {
    try {
        const id = c.req.param('id');
        const { name, display_name, description, permissions } = await c.req.json();

        if (!security.validateInput(id, 'uuid')) {
            return c.json(apiResponse.error( 'Invalid role ID'), 400);
        }

        const role = await Role.findById(id);
        if (!role) {
            return c.json(apiResponse.error( 'Role not found'), 404);
        }

        if (role.is_system) {
            return c.json(apiResponse.error( 'Cannot modify system role'), 403);
        }

        // Check if user is trying to modify their own role
        const currentUser = c.get('user');
        const currentNamespace = c.get('currentNamespace');
        const currentUserRole = await User.getRole ? await User.getRole(currentUser.id, currentNamespace.id) : null;
        if (currentUserRole && currentUserRole.id === id) {
            return c.json(apiResponse.error('You cannot modify your own role'), 403);
        }

        const updateData = {};
        
        if (name && security.validateInput(name, 'alphanumeric_underscore')) {
            if (name !== role.name) {
                const existingRole = await Role.findByName(name);
                if (existingRole) {
                    return c.json(apiResponse.error( 'Role name already exists'), 409);
                }
            }
            updateData.name = security.sanitizeInput(name);
        }

        if (display_name && security.validateInput(display_name, 'text')) {
            updateData.display_name = security.sanitizeInput(display_name);
        }

        if (description !== undefined) {
            updateData.description = description ? security.sanitizeInput(description) : null;
        }

        if (Object.keys(updateData).length === 0 && permissions === undefined) {
            return c.json(apiResponse.error( 'No valid data to update'), 400);
        }

        let updatedRole = role;
        if (Object.keys(updateData).length > 0) {
            updatedRole = await Role.update(id, updateData);
        }
        
        // Update permissions if provided
        if (permissions !== undefined) {
            if (Array.isArray(permissions)) {
                // Validate that all permission IDs are valid UUIDs
                for (const permissionId of permissions) {
                    if (!security.validateInput(permissionId, 'uuid')) {
                        return c.json(apiResponse.error('Invalid permission ID'), 400);
                    }
                }
                
                // Check if user has all the permissions they're trying to assign
                const userPermissions = await User.getPermissions(currentUser.id);
                const userPermissionIds = userPermissions.map(p => p.id);
                
                for (const permissionId of permissions) {
                    if (!userPermissionIds.includes(permissionId)) {
                        return c.json(apiResponse.error('You cannot assign permissions you do not have'), 403);
                    }
                }
                
                // Additional check: if role currently has permissions that user doesn't have,
                // user cannot modify this role at all
                const currentRolePermissions = await Role.getPermissions(id);
                const currentRolePermissionIds = currentRolePermissions.map(p => p.id);
                
                for (const permissionId of currentRolePermissionIds) {
                    if (!userPermissionIds.includes(permissionId)) {
                        return c.json(apiResponse.error('You cannot modify a role with permissions you do not have'), 403);
                    }
                }
                
                await Role.syncPermissions(id, permissions);
            } else {
                return c.json(apiResponse.error('Permissions must be an array'), 400);
            }
        }
        
        return c.json(apiResponse.success(updatedRole, 'Role updated successfully'));
    } catch (error) {
        console.error('Update role error:', error);
        return c.json(apiResponse.error( 'Failed to update role'), 500);
    }
});

roleController.delete('/:id', requirePermission('roles_delete'), async (c) => {
    try {
        const id = c.req.param('id');

        if (!security.validateInput(id, 'uuid')) {
            return c.json(apiResponse.error( 'Invalid role ID'), 400);
        }

        const role = await Role.findById(id);
        if (!role) {
            return c.json(apiResponse.error( 'Role not found'), 404);
        }

        if (role.is_system) {
            return c.json(apiResponse.error( 'Cannot delete system role'), 403);
        }

        // Check if any users are assigned to this role
        const currentNamespace = c.get('currentNamespace');
        const userCount = await Role.getUserCount(id, currentNamespace.id);
        if (userCount > 0) {
            return c.json(
                apiResponse.forbidden(`Cannot delete role. ${userCount} user(s) are still assigned to this role. Please reassign these users first.`),
                403
            );
        }

        await Role.delete(id);
        return c.json(apiResponse.success(null, 'Role deleted successfully'));
    } catch (error) {
        console.error('Delete role error:', error);
        return c.json(apiResponse.error( 'Failed to delete role'), 500);
    }
});

export default roleController;