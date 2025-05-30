import db from '../db.js';

export class Permission {
    static async findById(id) {
        return await db('permissions').where('id', id).first();
    }

    static async findByName(name) {
        return await db('permissions').where('name', name).first();
    }

    static async findAll() {
        return await db('permissions').orderBy(['category', 'name']);
    }

    static async findByCategory(category) {
        return await db('permissions')
            .where('category', category)
            .orderBy('name');
    }

    static async create(data) {
        const [id] = await db('permissions').insert(data).returning('id');
        return await this.findById(id);
    }

    static async update(id, data) {
        await db('permissions').where('id', id).update({
            ...data,
            updated_at: new Date()
        });
        return await this.findById(id);
    }

    static async delete(id) {
        return await db('permissions').where('id', id).del();
    }

    static async getRoles(permissionId) {
        return await db('roles')
            .join('role_permissions', 'roles.id', 'role_permissions.role_id')
            .where('role_permissions.permission_id', permissionId)
            .select('roles.*');
    }

    static async getUsers(permissionId) {
        return await db('users')
            .join('user_permissions', 'users.id', 'user_permissions.user_id')
            .where('user_permissions.permission_id', permissionId)
            .select('users.*');
    }

    static async paginate({ page = 1, limit = 10, search = '', category = '' } = {}) {
        const offset = (page - 1) * limit;
        
        let query = db('permissions');
        
        if (search) {
            query = query.where(function() {
                this.where('name', 'like', `%${search}%`)
                    .orWhere('display_name', 'like', `%${search}%`)
                    .orWhere('description', 'like', `%${search}%`);
            });
        }

        if (category) {
            query = query.where('category', category);
        }

        const [{ count }] = await query.clone().count('* as count');
        const total = parseInt(count);
        const totalPages = Math.ceil(total / limit);

        const permissions = await query
            .orderBy(['category', 'name'])
            .limit(limit)
            .offset(offset);

        return {
            data: permissions,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    static async getCategories() {
        const results = await db('permissions')
            .distinct('category')
            .whereNotNull('category')
            .orderBy('category');
        
        return results.map(row => row.category);
    }
}