import db from '../db.js';

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
    const { v7: uuidv7 } = await import('uuid');
    const id = uuidv7();
    
    await db(this.tableName).insert({
      id,
      ...userData,
      created_at: new Date(),
      updated_at: new Date()
    });
    return id;
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
    return await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('users', 'role_permissions.role_id', 'users.role_id')
      .where('users.id', userId)
      .select('permissions.*');
  }

  static async hasPermission(userId, permissionName) {
    const rolePermission = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('users', 'role_permissions.role_id', 'users.role_id')
      .where('users.id', userId)
      .where('permissions.name', permissionName)
      .first();

    return !!rolePermission;
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

  // Namespace-aware methods for multi-tenancy

  async getRoleInNamespace(namespaceId) {
    const result = await db('user_namespace_roles')
      .join('roles', 'user_namespace_roles.role_id', 'roles.id')
      .where('user_namespace_roles.user_id', this.id)
      .where('user_namespace_roles.namespace_id', namespaceId)
      .select('roles.*')
      .first();
    
    return result || null;
  }

  async getNamespaces() {
    const results = await db('user_namespace_roles')
      .join('namespaces', 'user_namespace_roles.namespace_id', 'namespaces.id')
      .join('roles', 'user_namespace_roles.role_id', 'roles.id')
      .where('user_namespace_roles.user_id', this.id)
      .select(
        'namespaces.id as namespace_id',
        'namespaces.name as namespace_name', 
        'namespaces.full_path as namespace_full_path',
        'roles.id as role_id',
        'roles.name as role_name',
        'roles.display_name as role_display_name'
      );

    return results.map(row => ({
      namespace: {
        id: row.namespace_id,
        name: row.namespace_name,
        full_path: row.namespace_full_path
      },
      role: {
        id: row.role_id,
        name: row.role_name,
        display_name: row.role_display_name
      }
    }));
  }

  async assignToNamespace(namespaceId, roleId) {
    try {
      await db('user_namespace_roles').insert({
        user_id: this.id,
        namespace_id: namespaceId,
        role_id: roleId
      });
      return true;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        // Update existing assignment
        await db('user_namespace_roles')
          .where({
            user_id: this.id,
            namespace_id: namespaceId
          })
          .update({
            role_id: roleId
          });
        return true;
      }
      throw error;
    }
  }

  async hasPermissionInNamespace(permissionName, namespaceId) {
    const permission = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('roles', 'role_permissions.role_id', 'roles.id')
      .join('user_namespace_roles', 'roles.id', 'user_namespace_roles.role_id')
      .where('user_namespace_roles.user_id', this.id)
      .where('user_namespace_roles.namespace_id', namespaceId)
      .where('permissions.name', permissionName)
      .first();

    return !!permission;
  }

  static async hasPermissionInNamespace(userId, permissionName, namespaceId) {
    // Debug the parameters
    console.log('hasPermissionInNamespace called with:', { userId, permissionName, namespaceId });
    
    // Check if any parameter is undefined
    if (!userId || !permissionName || !namespaceId) {
      console.error('Missing parameters in hasPermissionInNamespace:', { userId, permissionName, namespaceId });
      return false;
    }

    // Using raw query to avoid Knex schema issues with { db } import
    const permission = await db.raw(`
      SELECT p.* 
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN roles r ON rp.role_id = r.id
      INNER JOIN user_namespace_roles unr ON r.id = unr.role_id
      WHERE unr.user_id = ? 
        AND unr.namespace_id = ? 
        AND p.name = ?
      LIMIT 1
    `, [userId, namespaceId, permissionName]);

    return permission[0].length > 0;
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