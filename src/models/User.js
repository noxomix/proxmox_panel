import db from '../db.js';

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
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
      .orWhere('name', identity)
      .first();
    return user ? new User(user) : null;
  }

  static async create(userData) {
    const [id] = await db(this.tableName).insert(userData).returning('id');
    return this.findById(id);
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
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

export default User;