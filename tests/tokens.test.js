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
        type: 'session'
      });
      
      expect(sessionToken).toBeDefined();
      expect(sessionToken.type).toBe('session');
      expect(sessionToken.user_id).toBe(testUser.id);
    });

    test('should find session tokens by user', async () => {
      // Create multiple session tokens
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      
      const sessions = await Token.findSessionsByUserId(testUser.id);
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      sessions.forEach(session => {
        expect(session.type).toBe('session');
        expect(session.user_id).toBe(testUser.id);
      });
    });

    test('should revoke session tokens', async () => {
      const sessionToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'session'
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
  });

  describe('API Token Management', () => {
    test('should create API token', async () => {
      const apiToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'test-api-token-123',
        token_hash: null
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
        token_hash: null,
        created_at: new Date(Date.now() - 2000)
      });
      
      // Create new token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'new-token', 
        token_hash: null,
        created_at: new Date()
      });
      
      const latest = await Token.getLatestApiToken(testUser.id);
      expect(latest.token).toBe('new-token');
    });

    test('should return null for expired API tokens', async () => {
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'expired-token',
        token_hash: null,
        expires_at: new Date(Date.now() - 1000) // Expired
      });
      
      const token = await Token.getLatestApiToken(testUser.id);
      expect(token).toBe(null);
    });
  });

  describe('JWT Token Handling', () => {
    test('should create valid JWT token', () => {
      const payload = {
        id: testUser.id,
        type: 'api',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should verify valid JWT token', () => {
      const payload = {
        id: testUser.id,
        type: 'api',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.id).toBe(testUser.id);
      expect(decoded.type).toBe('api');
    });

    test('should reject expired JWT token', () => {
      const expiredPayload = {
        id: testUser.id,
        type: 'api',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired
      };
      
      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET);
      
      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET);
      }).toThrow('jwt expired');
    });

    test('should reject malformed JWT token', () => {
      const malformedToken = 'invalid.jwt.token';
      
      expect(() => {
        jwt.verify(malformedToken, process.env.JWT_SECRET);
      }).toThrow();
    });

    test('should properly revoke JWT sessions from database', async () => {
      // Create a session token with jwt_id
      const jwtId = 'test-jwt-id-' + Date.now();
      const sessionToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        jwt_id: jwtId
      });
      
      // Create a JWT with the same jti
      const payload = {
        id: testUser.id,
        type: 'session',
        jti: jwtId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      const jwtToken = jwt.sign(payload, process.env.JWT_SECRET);
      
      // Verify session exists in database
      let dbSession = await db('tokens')
        .where('jwt_id', jwtId)
        .where('type', 'session')
        .where('expires_at', '>', new Date())
        .first();
      expect(dbSession).toBeDefined();
      
      // Revoke the session from database
      await Token.deleteById(sessionToken.id);
      
      // Verify session is removed from database
      dbSession = await db('tokens')
        .where('jwt_id', jwtId)
        .where('type', 'session')
        .where('expires_at', '>', new Date())
        .first();
      expect(dbSession).toBeUndefined();
      
      // JWT should still be valid from crypto perspective
      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
      expect(decoded.jti).toBe(jwtId);
      
      // But middleware should reject it because session is revoked
      // This test verifies the logic would work in middleware
      expect(dbSession).toBeFalsy();
    });
  });

  describe('Token Cleanup', () => {
    test('should cleanup expired tokens', async () => {
      // Create expired token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        expires_at: new Date(Date.now() - 1000)
      });
      
      // Create valid token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        expires_at: new Date(Date.now() + 3600000)
      });
      
      // Cleanup expired
      await Token.cleanupExpired();
      
      // Check remaining tokens
      const remainingTokens = await db('tokens').where('user_id', testUser.id);
      expect(remainingTokens).toHaveLength(1);
      expect(new Date(remainingTokens[0].expires_at).getTime()).toBeGreaterThan(Date.now());
    });
  });
});