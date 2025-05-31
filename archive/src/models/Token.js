import db from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

class Token {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.token_hash = data.token_hash;
    this.token = data.token; // For API tokens
    this.type = data.type;
    this.ip_address = data.ip_address;
    this.user_agent = data.user_agent;
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

  static async create(userId, type = 'session', expiresInHours = 24, ipAddress = null, userAgent = null) {
    const { v7: uuidv7 } = await import('uuid');
    const token = await this.generateToken();
    const tokenHash = await this.hashToken(token);
    const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
    const tokenId = uuidv7();

    await db(this.tableName).insert({
      id: tokenId,
      user_id: userId,
      token_hash: tokenHash,
      type: type,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Find the created token by ID
    const tokenRecord = await db(this.tableName)
      .where('id', tokenId)
      .first();
    
    return { token, record: new Token(tokenRecord) };
  }

  static async findById(id) {
    const token = await db(this.tableName).where('id', id).first();
    return token ? new Token(token) : null;
  }

  static async findByToken(token) {
    // Check for API tokens (plain text comparison)
    const apiToken = await db(this.tableName)
      .where('token', token)
      .where('type', 'api')
      .where('expires_at', '>', new Date())
      .first();
    
    if (apiToken) {
      return new Token(apiToken);
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

  static async revokeAllUserSessionsExceptCurrent(userId, currentTokenId) {
    return await db(this.tableName)
      .where('user_id', userId)
      .where('type', 'session')
      .whereNot('id', currentTokenId)
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

  // Create API token with plain token storage
  static async createApiToken(tokenData) {
    const { v7: uuidv7 } = await import('uuid');
    const tokenId = uuidv7();
    
    await db(this.tableName).insert({
      id: tokenId,
      ...tokenData,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Find the created token by ID
    const token = await db(this.tableName)
      .where('id', tokenId)
      .first();
    
    return token ? new Token(token) : null;
  }

  // Get latest API token for user
  static async getLatestApiToken(userId) {
    const token = await db(this.tableName)
      .where('user_id', userId)
      .where('type', 'api')
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();
    
    return token ? new Token(token) : null;
  }

  // Delete all API tokens for a user
  static async deleteApiTokensByUserId(userId) {
    return await db(this.tableName)
      .where('user_id', userId)
      .where('type', 'api')
      .del();
  }

  // Get active sessions for user
  static async getActiveSessions(userId) {
    const sessions = await db(this.tableName)
      .where('user_id', userId)
      .where('type', 'session')
      .where('expires_at', '>', new Date())
      .orderBy('updated_at', 'desc')
      .select('id', 'jwt_id', 'created_at', 'updated_at', 'expires_at', 'ip_address', 'user_agent');
    
    return sessions;
  }

  // Delete token by ID
  static async deleteById(id) {
    return await db(this.tableName).where('id', id).del();
  }
}

export default Token;