import db from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

class Token {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.token_hash = data.token_hash;
    this.type = data.type;
    this.expires_at = data.expires_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static get tableName() {
    return 'tokens';
  }

  static async generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async hashToken(token) {
    const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
    return await bcrypt.hash(token + pepper, 12);
  }

  static async create(userId, type = 'session', expiresInHours = 24) {
    const token = await this.generateToken();
    const tokenHash = await this.hashToken(token);
    const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));

    // MySQL doesn't support .returning(), so we insert and then find by unique token_hash
    await db(this.tableName).insert({
      user_id: userId,
      token_hash: tokenHash,
      type: type,
      expires_at: expiresAt
    });

    // Find the created token by token_hash (which is unique)
    const tokenRecord = await db(this.tableName)
      .where('token_hash', tokenHash)
      .first();
    
    return { token, record: new Token(tokenRecord) };
  }

  static async findById(id) {
    const token = await db(this.tableName).where('id', id).first();
    return token ? new Token(token) : null;
  }

  static async findByToken(token) {
    const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
    const allTokens = await db(this.tableName)
      .where('expires_at', '>', new Date())
      .select('*');

    for (const tokenData of allTokens) {
      const isValid = await bcrypt.compare(token + pepper, tokenData.token_hash);
      if (isValid) {
        return new Token(tokenData);
      }
    }
    return null;
  }

  static async findByUserId(userId) {
    const tokens = await db(this.tableName)
      .where('user_id', userId)
      .where('expires_at', '>', new Date())
      .select('*');
    return tokens.map(token => new Token(token));
  }

  static async findSessionsByUserId(userId) {
    const tokens = await db(this.tableName)
      .where('user_id', userId)
      .where('type', 'session')
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .select('*');
    return tokens.map(token => new Token(token));
  }

  static async cleanupExpiredSessions() {
    return await db(this.tableName)
      .where('type', 'session')
      .where('expires_at', '<', new Date())
      .del();
  }

  static async enforceSessionLimit(userId, maxSessions = 5) {
    // First cleanup expired sessions
    await this.cleanupExpiredSessions();
    
    // Get current active sessions for user
    const sessions = await this.findSessionsByUserId(userId);
    
    // If we have 5 or more sessions, remove the oldest ones
    if (sessions.length >= maxSessions) {
      const sessionsToRemove = sessions.slice(maxSessions - 1);
      for (const session of sessionsToRemove) {
        await session.revoke();
      }
    }
  }

  static async cleanupExpired() {
    return await db(this.tableName)
      .where('expires_at', '<', new Date())
      .del();
  }

  async revoke() {
    return await db(Token.tableName).where('id', this.id).del();
  }

  async revokeAllUserTokens() {
    return await db(Token.tableName).where('user_id', this.user_id).del();
  }

  static async revokeAllUserSessions(userId) {
    return await db(this.tableName)
      .where('user_id', userId)
      .where('type', 'session')
      .del();
  }

  async updateExpiry(newExpiresAt) {
    await db(Token.tableName)
      .where('id', this.id)
      .update({
        expires_at: newExpiresAt,
        updated_at: new Date()
      });
    
    // Update local instance
    this.expires_at = newExpiresAt;
    this.updated_at = new Date();
  }

  isExpired() {
    return new Date() > new Date(this.expires_at);
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      type: this.type,
      expires_at: this.expires_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default Token;