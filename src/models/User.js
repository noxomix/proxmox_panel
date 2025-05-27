import { db } from '../db.js';

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.role_id = data.role_id;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    // Include joined role data from pagination
    this.role_name = data.role_name;
    this.role_display_name = data.role_display_name;
  }

  static get tableName() {
    return 'users';
  }

  static async findById(id) {
    const user = await db(this.tableName).where('id', id).first();
    return user ? new User(user) : null;
  }

  static async findByEmail(email) {
    const user = await db(this.tableName).where('email', email).first();
    return user ? new User(user) : null;
  }

  static async findByIdentity(identity) {
    const user = await db(this.tableName)
      .where('email', identity)
      .orWhere('username', identity)
      .first();
    return user ? new User(user) : null;
  }

  static async create(userData) {
    const [userId] = await db(this.tableName).insert({
      ...userData,
      created_at: new Date(),
      updated_at: new Date()
    });
    return userId;
  }

  static async findAll() {
    const users = await db(this.tableName).select('*');
    return users.map(user => new User(user));
  }

  async update(data) {
    await db(User.tableName).where('id', this.id).update({
      ...data,
      updated_at: new Date()
    });
    
    const updatedUser = await User.findById(this.id);
    Object.assign(this, updatedUser);
    return this;
  }

  async delete() {
    return await db(User.tableName).where('id', this.id).del();
  }

  toJSON() {
    const { password_hash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  static async getRole(userId) {
    const result = await db('users')
      .join('roles', 'users.role_id', 'roles.id')
      .where('users.id', userId)
      .select('roles.*')
      .first();
    return result;
  }

  static async getPermissions(userId) {
    const rolePermissions = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('users', 'role_permissions.role_id', 'users.role_id')
      .where('users.id', userId)
      .select('permissions.*');

    const directPermissions = await db('permissions')
      .join('user_permissions', 'permissions.id', 'user_permissions.permission_id')
      .where('user_permissions.user_id', userId)
      .select('permissions.*');

    const allPermissions = [...rolePermissions, ...directPermissions];
    const uniquePermissions = allPermissions.reduce((acc, perm) => {
      if (!acc.find(p => p.id === perm.id)) {
        acc.push(perm);
      }
      return acc;
    }, []);

    return uniquePermissions;
  }

  static async getRolePermissions(userId) {
    return await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('users', 'role_permissions.role_id', 'users.role_id')
      .where('users.id', userId)
      .select('permissions.*');
  }

  static async getDirectPermissions(userId) {
    return await db('permissions')
      .join('user_permissions', 'permissions.id', 'user_permissions.permission_id')
      .where('user_permissions.user_id', userId)
      .select('permissions.*');
  }

  static async hasPermission(userId, permissionName) {
    const rolePermission = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('users', 'role_permissions.role_id', 'users.role_id')
      .where('users.id', userId)
      .where('permissions.name', permissionName)
      .first();

    if (rolePermission) return true;

    const directPermission = await db('permissions')
      .join('user_permissions', 'permissions.id', 'user_permissions.permission_id')
      .where('user_permissions.user_id', userId)
      .where('permissions.name', permissionName)
      .first();

    return !!directPermission;
  }

  static async assignPermission(userId, permissionId) {
    try {
      await db('user_permissions').insert({
        user_id: userId,
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

  static async removePermission(userId, permissionId) {
    const deleted = await db('user_permissions')
      .where({
        user_id: userId,
        permission_id: permissionId
      })
      .del();
    return deleted > 0;
  }

  static async syncPermissions(userId, permissionIds) {
    await db.transaction(async (trx) => {
      await trx('user_permissions').where('user_id', userId).del();
      
      if (permissionIds.length > 0) {
        const inserts = permissionIds.map(permissionId => ({
          user_id: userId,
          permission_id: permissionId
        }));
        await trx('user_permissions').insert(inserts);
      }
    });
  }

  static async assignRole(userId, roleId) {
    await db('users')
      .where('id', userId)
      .update({
        role_id: roleId,
        updated_at: new Date()
      });
    return this.findById(userId);
  }

  // Update password
  static async updatePassword(userId, hashedPassword) {
    await db('users')
      .where('id', userId)
      .update({
        password_hash: hashedPassword,
        updated_at: new Date()
      });
    
    return this.findById(userId);
  }

  // Update user
  static async update(userId, updateData) {
    await db(this.tableName)
      .where('id', userId)
      .update({
        ...updateData,
        updated_at: new Date()
      });
    
    return this.findById(userId);
  }

  // Delete user
  static async delete(userId) {
    return await db(this.tableName).where('id', userId).del();
  }

  // Paginated user list with search
  static async paginate({ page = 1, limit = 10, search = '', status = '', sortBy = 'created_at', sortOrder = 'desc' }) {
    const offset = (page - 1) * limit;
    
    // Build base query with role join
    let query = db(this.tableName)
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .select('users.*', 'roles.name as role_name', 'roles.display_name as role_display_name');
    
    let countQuery = db(this.tableName).count('* as total');

    // Add search filters
    if (search) {
      const searchCondition = function() {
        this.where('users.name', 'like', `%${search}%`)
          .orWhere('users.email', 'like', `%${search}%`)
          .orWhere('users.username', 'like', `%${search}%`);
      };
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    // Add status filter
    if (status) {
      query = query.where('users.status', status);
      countQuery = countQuery.where('status', status);
    }

    // Get total count
    const [{ total }] = await countQuery;
    
    // Add sorting and pagination
    let orderColumn;
    if (sortBy.includes('.')) {
      orderColumn = sortBy;
    } else if (sortBy === 'role_name' || sortBy === 'role_display_name') {
      orderColumn = `roles.${sortBy.replace('role_', '')}`;
    } else {
      orderColumn = `users.${sortBy}`;
    }
    
    query = query
      .orderBy(orderColumn, sortOrder)
      .limit(limit)
      .offset(offset);

    // Execute query
    const users = await query;
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: users.map(user => new User(user)),
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }
}

export default User;