import { describe, test, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcrypt';
import Token from '../src/models/Token.js';
import db from '../src/db.js';

describe('Token Model', () => {
  let testUser;

  beforeEach(async () => {
    // Create test user
    testUser = await global.testUtils.createTestUser();
  });

  describe('deleteApiTokensByUserId', () => {
    test('should delete only API tokens for specific user', async () => {
      const otherUser = await global.testUtils.createTestUser({
        username: 'otheruser',
        email: 'other@example.com'
      });

      // Create various tokens
      await global.testUtils.createTestToken(testUser.id, { type: 'api', token: 'api-token-1' });
      await global.testUtils.createTestToken(testUser.id, { type: 'api', token: 'api-token-2' });
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      await global.testUtils.createTestToken(otherUser.id, { type: 'api', token: 'other-api-token' });

      // Delete API tokens for testUser
      await Token.deleteApiTokensByUserId(testUser.id);

      // Check results
      const remainingTokens = await db('tokens').select('*');
      
      // Should have 2 tokens left: 1 session for testUser, 1 API for otherUser
      expect(remainingTokens).toHaveLength(2);
      
      const testUserTokens = remainingTokens.filter(t => t.user_id === testUser.id);
      const otherUserTokens = remainingTokens.filter(t => t.user_id === otherUser.id);
      
      expect(testUserTokens).toHaveLength(1);
      expect(testUserTokens[0].type).toBe('session');
      
      expect(otherUserTokens).toHaveLength(1);
      expect(otherUserTokens[0].type).toBe('api');
    });

    test('should handle deletion when no API tokens exist', async () => {
      // Only create session tokens
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      
      // Should not throw error
      await expect(Token.deleteApiTokensByUserId(testUser.id)).resolves.toBeDefined();
      
      // Session should still exist
      const tokens = await db('tokens').where('user_id', testUser.id);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('session');
    });

    test('should handle non-existent user', async () => {
      await expect(Token.deleteApiTokensByUserId(99999)).resolves.toBeDefined();
    });
  });

  describe('createApiToken', () => {
    test('should create API token with correct fields', async () => {
      const tokenData = {
        user_id: testUser.id,
        token: 'test-api-token-123',
        type: 'api',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        ip_address: '192.168.1.100',
        user_agent: 'Test Browser'
      };

      const token = await Token.createApiToken(tokenData);

      expect(token).toBeInstanceOf(Token);
      expect(token.user_id).toBe(testUser.id);
      expect(token.token).toBe('test-api-token-123');
      expect(token.type).toBe('api');
      expect(token.ip_address).toBe('192.168.1.100');
      expect(token.user_agent).toBe('Test Browser');
      expect(token.created_at).toBeInstanceOf(Date);
      expect(token.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getLatestApiToken', () => {
    test('should return latest non-expired API token', async () => {
      // Create multiple API tokens with different creation times
      const oldToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'old-token',
        created_at: new Date(Date.now() - 2000)
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const newToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'new-token',
        created_at: new Date()
      });

      const latest = await Token.getLatestApiToken(testUser.id);

      expect(latest).toBeInstanceOf(Token);
      expect(latest.token).toBe('new-token');
      expect(latest.id).toBe(newToken.id);
    });

    test('should return null when no API tokens exist', async () => {
      const token = await Token.getLatestApiToken(testUser.id);
      expect(token).toBe(null);
    });

    test('should return null when only expired API tokens exist', async () => {
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'expired-token',
        expires_at: new Date(Date.now() - 1000)
      });

      const token = await Token.getLatestApiToken(testUser.id);
      expect(token).toBe(null);
    });

    test('should ignore session tokens', async () => {
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });

      const token = await Token.getLatestApiToken(testUser.id);
      expect(token).toBe(null);
    });
  });

  describe('findByToken', () => {
    test('should find API token by plain text comparison', async () => {
      const apiToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'plain-api-token-123',
        token_hash: null
      });

      const found = await Token.findByToken('plain-api-token-123');

      expect(found).toBeInstanceOf(Token);
      expect(found.id).toBe(apiToken.id);
      expect(found.type).toBe('api');
    });

    test('should find session token by hash comparison', async () => {
      const tokenValue = 'session-token-456';
      const tokenHash = await bcrypt.hash(tokenValue, 10);
      
      const sessionToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        token_hash: tokenHash,
        token: null
      });

      const found = await Token.findByToken(tokenValue);

      expect(found).toBeInstanceOf(Token);
      expect(found.id).toBe(sessionToken.id);
      expect(found.type).toBe('session');
    });

    test('should return null for non-existent token', async () => {
      const found = await Token.findByToken('non-existent-token');
      expect(found).toBe(null);
    });

    test('should return null for expired tokens', async () => {
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'expired-api-token',
        expires_at: new Date(Date.now() - 1000)
      });

      const found = await Token.findByToken('expired-api-token');
      expect(found).toBe(null);
    });

    test('should prioritize API tokens over session tokens', async () => {
      const tokenValue = 'duplicate-token-value';
      
      // Create session token with hash
      const sessionHash = await bcrypt.hash(tokenValue, 10);
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        token_hash: sessionHash,
        token: null
      });

      // Create API token with same value
      const apiToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: tokenValue,
        token_hash: null
      });

      const found = await Token.findByToken(tokenValue);

      expect(found).toBeInstanceOf(Token);
      expect(found.id).toBe(apiToken.id);
      expect(found.type).toBe('api');
    });
  });

  describe('Session Management', () => {
    test('should get active sessions for user', async () => {
      const otherUser = await global.testUtils.createTestUser({
        username: 'otheruser',
        email: 'other@example.com'
      });

      // Create sessions for testUser
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        ip_address: '192.168.1.100',
        user_agent: 'Chrome'
      });
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        ip_address: '192.168.1.101',
        user_agent: 'Firefox'
      });

      // Create session for other user
      await global.testUtils.createTestToken(otherUser.id, {
        type: 'session',
        ip_address: '192.168.1.200'
      });

      // Create expired session
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        expires_at: new Date(Date.now() - 1000)
      });

      const sessions = await Token.getActiveSessions(testUser.id);

      expect(sessions).toHaveLength(2);
      sessions.forEach(session => {
        expect(session.ip_address).toMatch(/192\.168\.1\.10[01]/);
        expect(['Chrome', 'Firefox']).toContain(session.user_agent);
      });
    });

    test('should revoke all user sessions except current', async () => {
      // Create multiple sessions
      const session1 = await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      const session2 = await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      const currentSession = await global.testUtils.createTestToken(testUser.id, { type: 'session' });

      await Token.revokeAllUserSessionsExceptCurrent(testUser.id, currentSession.id);

      const remainingSessions = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'session');

      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].id).toBe(currentSession.id);
    });

    test('should enforce session limit', async () => {
      // Create 6 sessions (exceeds limit of 5)
      const sessions = [];
      for (let i = 0; i < 6; i++) {
        const session = await global.testUtils.createTestToken(testUser.id, {
          type: 'session',
          created_at: new Date(Date.now() + i * 1000) // Different creation times
        });
        sessions.push(session);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await Token.enforceSessionLimit(testUser.id, 5);

      const remainingSessions = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'session')
        .orderBy('created_at', 'desc');

      expect(remainingSessions).toHaveLength(4); // 5 limit - 1 oldest removed
      
      // Should keep the 4 newest sessions
      const remainingIds = remainingSessions.map(s => s.id);
      expect(remainingIds).toContain(sessions[5].id); // Newest
      expect(remainingIds).toContain(sessions[4].id);
      expect(remainingIds).toContain(sessions[3].id);
      expect(remainingIds).toContain(sessions[2].id);
      expect(remainingIds).not.toContain(sessions[1].id); // Should be removed
      expect(remainingIds).not.toContain(sessions[0].id); // Should be removed
    });
  });

  describe('Token Cleanup', () => {
    test('should cleanup expired tokens', async () => {
      // Create mix of expired and valid tokens
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        expires_at: new Date(Date.now() - 1000) // Expired
      });
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        expires_at: new Date(Date.now() - 2000) // Expired
      });
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        expires_at: new Date(Date.now() + 3600000) // Valid
      });

      await Token.cleanupExpired();

      const remainingTokens = await db('tokens').where('user_id', testUser.id);
      expect(remainingTokens).toHaveLength(1);
      expect(remainingTokens[0].type).toBe('session');
      expect(new Date(remainingTokens[0].expires_at)).toBeInstanceOf(Date);
      expect(new Date(remainingTokens[0].expires_at).getTime()).toBeGreaterThan(Date.now());
    });
  });
});