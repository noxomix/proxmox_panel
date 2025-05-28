import { describe, test, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import db from '../src/db.js';
import Token from '../src/models/Token.js';

describe('Token Management Tests', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await global.testUtils.createTestUser();
  });

  describe('Session Token Management', () => {
    test('should create session token', async () => {
      const sessionToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: 'test-jwt-id'
      });
      
      expect(sessionToken).toBeDefined();
      expect(sessionToken.type).toBe('session');
      expect(sessionToken.user_id).toBe(testUser.id);
      expect(sessionToken.jwt_id).toBe('test-jwt-id');
    });

    test('should find session tokens by user', async () => {
      // Create multiple session tokens
      await global.testUtils.createTestToken(testUser.id, { 
        type: 'session',
        jwt_id: 'jwt-1'
      });
      await global.testUtils.createTestToken(testUser.id, { 
        type: 'session',
        jwt_id: 'jwt-2'
      });
      
      const sessions = await Token.findSessionsByUserId(testUser.id);
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      sessions.forEach(session => {
        expect(session.type).toBe('session');
        expect(session.user_id).toBe(testUser.id);
      });
    });

    test('should revoke session tokens', async () => {
      const sessionToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: 'jwt-to-revoke'
      });
      
      // Verify token exists
      let tokens = await db('tokens').where('id', sessionToken.id);
      expect(tokens).toHaveLength(1);
      
      // Revoke token
      const token = new Token(sessionToken);
      await token.revoke();
      
      // Verify token is gone
      tokens = await db('tokens').where('id', sessionToken.id);
      expect(tokens).toHaveLength(0);
    });

    test('should find valid session by JWT ID', async () => {
      const jwtId = 'unique-jwt-id';
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: jwtId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Future
      });
      
      const session = await Token.findValidSessionByJwtId(jwtId);
      expect(session).toBeTruthy();
      expect(session.jwt_id).toBe(jwtId);
    });

    test('should not find expired session by JWT ID', async () => {
      const jwtId = 'expired-jwt-id';
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: jwtId,
        expires_at: new Date(Date.now() - 1000) // Past
      });
      
      const session = await Token.findValidSessionByJwtId(jwtId);
      expect(session).toBeNull();
    });
  });

  describe('API Token Management', () => {
    test('should create API token', async () => {
      const apiToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'test-api-token-123'
      });
      
      expect(apiToken).toBeDefined();
      expect(apiToken.type).toBe('api');
      expect(apiToken.token).toBe('test-api-token-123');
      expect(apiToken.user_id).toBe(testUser.id);
    });

    test('should get latest API token', async () => {
      // Create old token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'old-token',
        created_at: new Date(Date.now() - 2000)
      });
      
      // Create new token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'new-token',
        created_at: new Date()
      });
      
      const latest = await Token.getLatestApiToken(testUser.id);
      expect(latest.token).toBe('new-token');
    });

    test('should return null for expired API tokens', async () => {
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'expired-token',
        expires_at: new Date(Date.now() - 1000) // Expired
      });
      
      const token = await Token.getLatestApiToken(testUser.id);
      expect(token).toBe(null);
    });

    test('should delete old API tokens for user', async () => {
      // Create multiple API tokens
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'token-1'
      });
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'token-2'
      });
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: 'session-token' // Should not be deleted
      });
      
      // Delete API tokens
      await Token.deleteApiTokensForUser(testUser.id);
      
      // Check that API tokens are gone but session remains
      const apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(0);
      
      const sessionTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'session');
      expect(sessionTokens).toHaveLength(1);
    });

    test('should find valid API token', async () => {
      const plainToken = 'valid-api-token';
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: plainToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Future
      });
      
      const token = await Token.findValidApiToken(plainToken);
      expect(token).toBeTruthy();
      expect(token.token).toBe(plainToken);
    });

    test('should not find expired API token', async () => {
      const plainToken = 'expired-api-token';
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: plainToken,
        expires_at: new Date(Date.now() - 1000) // Past
      });
      
      const token = await Token.findValidApiToken(plainToken);
      expect(token).toBeNull();
    });
  });

  describe('Token Expiration', () => {
    test('should clean up expired tokens', async () => {
      // Create expired tokens
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: 'expired-1',
        expires_at: new Date(Date.now() - 2000)
      });
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'expired-2',
        expires_at: new Date(Date.now() - 1000)
      });
      
      // Create valid token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: 'valid-1',
        expires_at: new Date(Date.now() + 10000)
      });
      
      // Clean expired tokens
      const deleted = await Token.cleanExpired();
      expect(deleted).toBeGreaterThanOrEqual(2);
      
      // Verify only valid token remains
      const remaining = await db('tokens').where('user_id', testUser.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].jwt_id).toBe('valid-1');
    });
  });

  describe('Token Static Methods', () => {
    test('should create token from JWT data', async () => {
      const tokenData = {
        user_id: testUser.id,
        type: 'session',
        jwt_id: 'from-jwt',
        expires_at: new Date(Date.now() + 3600000),
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser'
      };
      
      const tokenId = await Token.create(tokenData);
      expect(tokenId).toBeDefined();
      
      const created = await db('tokens').where('id', tokenId).first();
      expect(created.user_id).toBe(testUser.id);
      expect(created.jwt_id).toBe('from-jwt');
      expect(created.ip_address).toBe('192.168.1.1');
    });

    test('should revoke all sessions for user', async () => {
      // Create multiple sessions
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: 'session-1'
      });
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session', 
        jwt_id: 'session-2'
      });
      
      // Revoke all sessions
      const revoked = await Token.revokeAllSessions(testUser.id);
      expect(revoked).toBeGreaterThanOrEqual(2);
      
      // Verify all sessions are gone
      const sessions = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'session');
      expect(sessions).toHaveLength(0);
    });
  });
});