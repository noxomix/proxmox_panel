import db from '../db.js';

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.role = data.role || 'user';
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
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
    
    // Build base query
    let query = db(this.tableName).select('*');
    let countQuery = db(this.tableName).count('* as total');

    // Add search filters
    if (search) {
      const searchCondition = function() {
        this.where('name', 'like', `%${search}%`)
          .orWhere('email', 'like', `%${search}%`)
          .orWhere('username', 'like', `%${search}%`);
      };
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    // Add status filter
    if (status) {
      query = query.where('status', status);
      countQuery = countQuery.where('status', status);
    }

    // Get total count
    const [{ total }] = await countQuery;
    
    // Add sorting and pagination
    query = query
      .orderBy(sortBy, sortOrder)
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