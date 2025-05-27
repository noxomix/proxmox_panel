import { db } from '../db.js';

export class Role {
    static async findById(id) {
        return await db('roles').where('id', id).first();
    }

    static async findByName(name) {
        return await db('roles').where('name', name).first();
    }

    static async findAll() {
        return await db('roles').orderBy('name');
    }

    static async create(data) {
        await db('roles').insert(data);
        // Since we can't use .returning() with MySQL, find the newly created record
        // by using a combination of name and creation timestamp
        const role = await db('roles')
            .where('name', data.name)
            .orderBy('created_at', 'desc')
            .first();
        return role;
    }

    static async update(id, data) {
        await db('roles').where('id', id).update({
            ...data,
            updated_at: new Date()
        });
        return await this.findById(id);
    }

    static async delete(id) {
        return await db('roles').where('id', id).del();
    }

    static async getPermissions(roleId) {
        return await db('permissions')
            .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
            .where('role_permissions.role_id', roleId)
            .select('permissions.*');
    }

    static async assignPermission(roleId, permissionId) {
        try {
            await db('role_permissions').insert({
                role_id: roleId,
                permission_id: permissionId
            });
            return true;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return false;
            }
            throw error;
        }
    }

    static async removePermission(roleId, permissionId) {
        const deleted = await db('role_permissions')
            .where({
                role_id: roleId,
                permission_id: permissionId
            })
            .del();
        return deleted > 0;
    }

    static async syncPermissions(roleId, permissionIds) {
        await db.transaction(async (trx) => {
            await trx('role_permissions').where('role_id', roleId).del();
            
            if (permissionIds.length > 0) {
                const inserts = permissionIds.map(permissionId => ({
                    role_id: roleId,
                    permission_id: permissionId
                }));
                await trx('role_permissions').insert(inserts);
            }
        });
    }

    static async paginate({ page = 1, limit = 10, search = '' } = {}) {
        const offset = (page - 1) * limit;
        
        let query = db('roles');
        
        if (search) {
            query = query.where(function() {
                this.where('name', 'like', `%${search}%`)
                    .orWhere('display_name', 'like', `%${search}%`);
            });
        }

        const [{ count }] = await query.clone().count('* as count');
        const total = parseInt(count);
        const totalPages = Math.ceil(total / limit);

        const roles = await query
            .orderBy('name')
            .limit(limit)
            .offset(offset);

        return {
            data: roles,
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
}