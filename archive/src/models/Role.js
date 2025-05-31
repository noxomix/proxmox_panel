import db from '../db.js';
import { ROLE_CONFIG } from '../config/roles.js';

export class Role {
    static async findById(id) {
        return await db('roles').where('id', id).first();
    }

    static async findByName(name) {
        return await db('roles').where('name', name).first();
    }

    static async findAll(namespaceId = null) {
        let query = db('roles');
        
        if (namespaceId) {
            // Show roles available in this namespace (inherited + own)
            query = query.leftJoin('namespaces as origin_ns', 'roles.origin_namespace_id', 'origin_ns.id')
                .leftJoin('namespaces as target_ns', function() {
                    this.on('target_ns.id', '=', db.raw('?', [namespaceId]));
                })
                .where(function() {
                    this.where('roles.origin_namespace_id', namespaceId) // Own roles
                        .orWhere(function() {
                            // Inherited roles - role's origin is ancestor of target namespace
                            this.whereRaw('target_ns.full_path LIKE CONCAT(origin_ns.full_path, "/%")')
                                .orWhere('origin_ns.parent_id', null); // Root namespace roles
                        });
                })
                .select('roles.*', 'origin_ns.name as origin_namespace_name', 'origin_ns.full_path as origin_namespace_path');
        }
        
        return await query.orderBy('name');
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

    static async getUserCount(roleId, namespaceId = null) {
        let query = db('user_namespace_roles')
            .where('role_id', roleId);
            
        if (namespaceId) {
            query = query.where('namespace_id', namespaceId);
        }
        
        const result = await query
            .count('user_id as count')
            .first();
        return result.count;
    }

    // Use centralized role configuration
    static getRoleLevel(roleName) {
        return ROLE_CONFIG.getLevel(roleName);
    }

    static canAssignRole(currentUserRoleName, targetRoleName) {
        return ROLE_CONFIG.canAssignRole(currentUserRoleName, targetRoleName);
    }

    static async getAssignableRoles(currentUserRoleName) {
        const allRoles = await this.findAll();
        return ROLE_CONFIG.getAssignableRoles(currentUserRoleName, allRoles);
    }

    // Namespace-aware methods for multi-tenancy

    static async getAvailableInNamespace(namespaceId) {
        // Get target namespace for inheritance calculation
        const targetNamespace = await db('namespaces').where('id', namespaceId).first();
        if (!targetNamespace) {
            return [];
        }

        return await db('roles')
            .leftJoin('namespaces as origin_ns', 'roles.origin_namespace_id', 'origin_ns.id')
            .where(function() {
                this.where('roles.origin_namespace_id', namespaceId) // Own roles
                    .orWhere(function() {
                        // Inherited roles - role's origin is ancestor of target namespace
                        this.whereRaw('? LIKE CONCAT(origin_ns.full_path, "/%")', [targetNamespace.full_path])
                            .orWhere('origin_ns.parent_id', null); // Root namespace roles
                    });
            })
            .select('roles.*', 'origin_ns.name as origin_namespace_name', 'origin_ns.full_path as origin_namespace_path')
            .orderBy('roles.name');
    }

    static async isEditableInNamespace(roleId, namespaceId) {
        const role = await this.findById(roleId);
        if (!role) {
            return false;
        }

        // Role is editable only in its origin namespace
        return role.origin_namespace_id === namespaceId;
    }

    async getOriginNamespace() {
        if (!this.origin_namespace_id) {
            return null;
        }

        return await db('namespaces')
            .where('id', this.origin_namespace_id)
            .first();
    }

    // Instance method to check if role is editable in namespace
    async isEditableInNamespace(namespaceId) {
        return Role.isEditableInNamespace(this.id, namespaceId);
    }
}