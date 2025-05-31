import db from '../db.js';

class UserNamespaceRole {
  static get tableName() {
    return 'user_namespace_roles';
  }

  constructor(data) {
    this.user_id = data.user_id;
    this.namespace_id = data.namespace_id;
    this.role_id = data.role_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Core CRUD operations

  static async create(userId, namespaceId, roleId) {
    try {
      await db(this.tableName).insert({
        user_id: userId,
        namespace_id: namespaceId,
        role_id: roleId,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return await this.findByUserAndNamespace(userId, namespaceId);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('User is already assigned to this namespace');
      }
      throw error;
    }
  }

  static async findByUserAndNamespace(userId, namespaceId) {
    const result = await db(this.tableName)
      .where({ user_id: userId, namespace_id: namespaceId })
      .first();
    
    return result ? new UserNamespaceRole(result) : null;
  }

  static async findByUser(userId) {
    const results = await db(this.tableName)
      .join('namespaces', 'user_namespace_roles.namespace_id', 'namespaces.id')
      .join('roles', 'user_namespace_roles.role_id', 'roles.id')
      .where('user_namespace_roles.user_id', userId)
      .select(
        'user_namespace_roles.*',
        'namespaces.name as namespace_name',
        'namespaces.full_path as namespace_path',
        'roles.name as role_name',
        'roles.display_name as role_display_name'
      )
      .orderBy('namespaces.full_path');

    return results.map(row => ({
      ...new UserNamespaceRole(row),
      namespace: {
        id: row.namespace_id,
        name: row.namespace_name,
        full_path: row.namespace_path
      },
      role: {
        id: row.role_id,
        name: row.role_name,
        display_name: row.role_display_name
      }
    }));
  }

  static async findByNamespace(namespaceId) {
    const results = await db(this.tableName)
      .join('users', 'user_namespace_roles.user_id', 'users.id')
      .join('roles', 'user_namespace_roles.role_id', 'roles.id')
      .where('user_namespace_roles.namespace_id', namespaceId)
      .select(
        'user_namespace_roles.*',
        'users.name as user_name',
        'users.username',
        'users.email',
        'users.status as user_status',
        'roles.name as role_name',
        'roles.display_name as role_display_name'
      )
      .orderBy('users.name');

    return results.map(row => ({
      ...new UserNamespaceRole(row),
      user: {
        id: row.user_id,
        name: row.user_name,
        username: row.username,
        email: row.email,
        status: row.user_status
      },
      role: {
        id: row.role_id,
        name: row.role_name,
        display_name: row.role_display_name
      }
    }));
  }

  static async findByRole(roleId) {
    const results = await db(this.tableName)
      .join('users', 'user_namespace_roles.user_id', 'users.id')
      .join('namespaces', 'user_namespace_roles.namespace_id', 'namespaces.id')
      .where('user_namespace_roles.role_id', roleId)
      .select(
        'user_namespace_roles.*',
        'users.name as user_name',
        'users.username',
        'users.email',
        'namespaces.name as namespace_name',
        'namespaces.full_path as namespace_path'
      )
      .orderBy('namespaces.full_path');

    return results.map(row => ({
      ...new UserNamespaceRole(row),
      user: {
        id: row.user_id,
        name: row.user_name,
        username: row.username,
        email: row.email
      },
      namespace: {
        id: row.namespace_id,
        name: row.namespace_name,
        full_path: row.namespace_path
      }
    }));
  }

  // Update operations

  static async updateRole(userId, namespaceId, newRoleId) {
    const updated = await db(this.tableName)
      .where({ user_id: userId, namespace_id: namespaceId })
      .update({
        role_id: newRoleId,
        updated_at: new Date()
      });

    if (updated === 0) {
      throw new Error('User namespace assignment not found');
    }

    return await this.findByUserAndNamespace(userId, namespaceId);
  }

  // Delete operations

  static async delete(userId, namespaceId) {
    const deleted = await db(this.tableName)
      .where({ user_id: userId, namespace_id: namespaceId })
      .del();

    return deleted > 0;
  }

  static async deleteAllForUser(userId) {
    return await db(this.tableName)
      .where({ user_id: userId })
      .del();
  }

  static async deleteAllForNamespace(namespaceId) {
    return await db(this.tableName)
      .where({ namespace_id: namespaceId })
      .del();
  }

  static async deleteAllForRole(roleId) {
    return await db(this.tableName)
      .where({ role_id: roleId })
      .del();
  }

  // Validation and utility methods

  static async exists(userId, namespaceId) {
    const result = await db(this.tableName)
      .where({ user_id: userId, namespace_id: namespaceId })
      .first();
    
    return !!result;
  }

  static async getRoleForUser(userId, namespaceId) {
    const result = await db(this.tableName)
      .join('roles', 'user_namespace_roles.role_id', 'roles.id')
      .where('user_namespace_roles.user_id', userId)
      .where('user_namespace_roles.namespace_id', namespaceId)
      .select('roles.*')
      .first();

    return result || null;
  }

  static async getUsersInNamespaceWithRole(namespaceId, roleId) {
    const results = await db(this.tableName)
      .join('users', 'user_namespace_roles.user_id', 'users.id')
      .where('user_namespace_roles.namespace_id', namespaceId)
      .where('user_namespace_roles.role_id', roleId)
      .select('users.*')
      .orderBy('users.name');

    return results;
  }

  static async getNamespacesForUserWithRole(userId, roleId) {
    const results = await db(this.tableName)
      .join('namespaces', 'user_namespace_roles.namespace_id', 'namespaces.id')
      .where('user_namespace_roles.user_id', userId)
      .where('user_namespace_roles.role_id', roleId)
      .select('namespaces.*')
      .orderBy('namespaces.full_path');

    return results;
  }

  // Bulk operations

  static async assignUserToMultipleNamespaces(userId, namespaceRoleAssignments) {
    return await db.transaction(async (trx) => {
      const assignments = [];
      
      for (const { namespaceId, roleId } of namespaceRoleAssignments) {
        // Check if assignment already exists
        const existing = await trx(this.tableName)
          .where({ user_id: userId, namespace_id: namespaceId })
          .first();

        if (!existing) {
          assignments.push({
            user_id: userId,
            namespace_id: namespaceId,
            role_id: roleId,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      if (assignments.length > 0) {
        await trx(this.tableName).insert(assignments);
      }

      return assignments.length;
    });
  }

  static async assignMultipleUsersToNamespace(namespaceId, userRoleAssignments) {
    return await db.transaction(async (trx) => {
      const assignments = [];
      
      for (const { userId, roleId } of userRoleAssignments) {
        // Check if assignment already exists
        const existing = await trx(this.tableName)
          .where({ user_id: userId, namespace_id: namespaceId })
          .first();

        if (!existing) {
          assignments.push({
            user_id: userId,
            namespace_id: namespaceId,
            role_id: roleId,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      if (assignments.length > 0) {
        await trx(this.tableName).insert(assignments);
      }

      return assignments.length;
    });
  }

  // Statistics and reporting

  static async getAssignmentCount() {
    const result = await db(this.tableName).count('* as count').first();
    return parseInt(result.count);
  }

  static async getAssignmentCountByNamespace(namespaceId) {
    const result = await db(this.tableName)
      .where({ namespace_id: namespaceId })
      .count('* as count')
      .first();
    return parseInt(result.count);
  }

  static async getAssignmentCountByUser(userId) {
    const result = await db(this.tableName)
      .where({ user_id: userId })
      .count('* as count')
      .first();
    return parseInt(result.count);
  }

  static async getAssignmentCountByRole(roleId) {
    const result = await db(this.tableName)
      .where({ role_id: roleId })
      .count('* as count')
      .first();
    return parseInt(result.count);
  }
}

export default UserNamespaceRole;