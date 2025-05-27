import { Hono } from 'hono';
import { Permission } from '../models/Permission.js';
import { apiResponse } from '../utils/response.js';
import { security } from '../utils/security.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const permissionController = new Hono();

permissionController.use('*', authMiddleware);
permissionController.use('*', requirePermission('permission_manage'));

permissionController.get('/', async (c) => {
    try {
        const page = Math.max(1, parseInt(c.req.query('page')) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit')) || 10));
        const search = security.sanitizeInput(c.req.query('search') || '');
        const category = security.sanitizeInput(c.req.query('category') || '');
        
        const result = await Permission.paginate({ page, limit, search, category });
        return c.json(apiResponse.success(result, 'Permissions retrieved successfully'));
    } catch (error) {
        console.error('Get permissions error:', error);
        return c.json(apiResponse.error( 'Failed to retrieve permissions'), 500);
    }
});

permissionController.get('/categories', async (c) => {
    try {
        const categories = await Permission.getCategories();
        return c.json(apiResponse.success(categories, 'Categories retrieved successfully'));
    } catch (error) {
        console.error('Get categories error:', error);
        return c.json(apiResponse.error( 'Failed to retrieve categories'), 500);
    }
});

permissionController.get('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        
        if (!security.validateInput(id, 'uuid')) {
            return c.json(apiResponse.error( 'Invalid permission ID'), 400);
        }

        const permission = await Permission.findById(id);
        if (!permission) {
            return c.json(apiResponse.error( 'Permission not found'), 404);
        }
        
        return c.json(apiResponse.success(permission, 'Permission retrieved successfully'));
    } catch (error) {
        console.error('Get permission error:', error);
        return c.json(apiResponse.error( 'Failed to retrieve permission'), 500);
    }
});

permissionController.post('/', async (c) => {
    try {
        const { name, display_name, description, category } = await c.req.json();

        if (!name || !security.validateInput(name, 'alphanumeric_underscore')) {
            return c.json(apiResponse.error( 'Invalid permission name'), 400);
        }

        if (!display_name || !security.validateInput(display_name, 'text')) {
            return c.json(apiResponse.error( 'Invalid display name'), 400);
        }

        if (category && !security.validateInput(category, 'alphanumeric_underscore')) {
            return c.json(apiResponse.error( 'Invalid category'), 400);
        }

        const existingPermission = await Permission.findByName(name);
        if (existingPermission) {
            return c.json(apiResponse.error( 'Permission name already exists'), 409);
        }

        const permissionData = {
            name: security.sanitizeInput(name),
            display_name: security.sanitizeInput(display_name),
            description: description ? security.sanitizeInput(description) : null,
            category: category ? security.sanitizeInput(category) : null,
            is_system: false
        };

        const permission = await Permission.create(permissionData);
        return c.json(apiResponse.success(permission, 'Permission created successfully'), 201);
    } catch (error) {
        console.error('Create permission error:', error);
        return c.json(apiResponse.error( 'Failed to create permission'), 500);
    }
});

permissionController.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');

        if (!security.validateInput(id, 'uuid')) {
            return c.json(apiResponse.error( 'Invalid permission ID'), 400);
        }

        const permission = await Permission.findById(id);
        if (!permission) {
            return c.json(apiResponse.error( 'Permission not found'), 404);
        }

        if (permission.is_system) {
            return c.json(apiResponse.error( 'Cannot delete system permission'), 403);
        }

        await Permission.delete(id);
        return c.json(apiResponse.success(null, 'Permission deleted successfully'));
    } catch (error) {
        console.error('Delete permission error:', error);
        return c.json(apiResponse.error( 'Failed to delete permission'), 500);
    }
});

export default permissionController;