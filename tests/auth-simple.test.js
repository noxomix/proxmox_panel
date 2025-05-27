import { describe, test, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../src/db.js';
import Token from '../src/models/Token.js';

describe('Token Model - Regenerate with Delete Logic', () => {
  let testUser;

  beforeEach(async () => {
    // Create test user
    testUser = await global.testUtils.createTestUser();
  });

  describe('API Token Regeneration', () => {
    test('should delete old API tokens when creating new ones', async () => {
      // Create initial API token
      const firstToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'first-api-token-123',
        token_hash: null
      });

      // Verify first token exists
      let apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe('first-api-token-123');

      // Delete existing API tokens (simulate regeneration)
      await Token.deleteApiTokensByUserId(testUser.id);

      // Create new API token
      const secondToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'second-api-token-456',
        token_hash: null
      });

      // Verify only the new token exists
      apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe('second-api-token-456');
      expect(apiTokens[0].id).not.toBe(firstToken.id);
    });

    test('should handle multiple regenerations correctly', async () => {
      const tokens = [];
      
      // Generate 5 tokens in sequence, each time deleting old ones
      for (let i = 0; i < 5; i++) {
        // Delete existing API tokens
        await Token.deleteApiTokensByUserId(testUser.id);
        
        // Create new token
        const token = await global.testUtils.createTestToken(testUser.id, {
          type: 'api',
          token: `api-token-${i}`,
          token_hash: null
        });
        
        tokens.push(token);
        
        // Verify only one API token exists
        const apiTokens = await db('tokens')
          .where('user_id', testUser.id)
          .where('type', 'api');
        
        expect(apiTokens).toHaveLength(1);
        expect(apiTokens[0].token).toBe(`api-token-${i}`);
      }

      // Final verification - should only have the last token
      const finalTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      
      expect(finalTokens).toHaveLength(1);
      expect(finalTokens[0].token).toBe('api-token-4');
    });

    test('should only delete API tokens, not session tokens', async () => {
      // Create session tokens
      const sessionToken1 = await global.testUtils.createTestToken(testUser.id, {
        type: 'session'
      });
      const sessionToken2 = await global.testUtils.createTestToken(testUser.id, {
        type: 'session'
      });

      // Create API token
      const apiToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'api-token-123',
        token_hash: null
      });

      // Delete API tokens
      await Token.deleteApiTokensByUserId(testUser.id);

      // Verify session tokens still exist but API token is gone
      const sessionTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'session');
      
      const apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');

      expect(sessionTokens).toHaveLength(2);
      expect(apiTokens).toHaveLength(0);
    });

    test('should handle deletion when no API tokens exist', async () => {
      // Ensure no API tokens exist
      const initialTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(initialTokens).toHaveLength(0);

      // Should not throw error
      await expect(Token.deleteApiTokensByUserId(testUser.id)).resolves.toBeDefined();

      // Still no tokens
      const finalTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(finalTokens).toHaveLength(0);
    });

    test('should work for different users independently', async () => {
      const otherUser = await global.testUtils.createTestUser();

      // Create API tokens for both users
      const userToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'user-token',
        token_hash: null
      });

      const otherUserToken = await global.testUtils.createTestToken(otherUser.id, {
        type: 'api',
        token: 'other-user-token',
        token_hash: null
      });

      // Delete API tokens for first user only
      await Token.deleteApiTokensByUserId(testUser.id);

      // Verify first user's tokens are gone, second user's remain
      const userTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      
      const otherUserTokens = await db('tokens')
        .where('user_id', otherUser.id)
        .where('type', 'api');

      expect(userTokens).toHaveLength(0);
      expect(otherUserTokens).toHaveLength(1);
      expect(otherUserTokens[0].token).toBe('other-user-token');
    });
  });

  describe('Token Retrieval and Validation', () => {
    test('should retrieve latest non-expired API token', async () => {
      // Create old token
      const oldToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'old-token',
        token_hash: null,
        created_at: new Date(Date.now() - 2000)
      });

      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new token
      const newToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'new-token',
        token_hash: null,
        created_at: new Date()
      });

      const latest = await Token.getLatestApiToken(testUser.id);

      expect(latest).toBeInstanceOf(Token);
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

    test('should find API tokens by plain text comparison', async () => {
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

    test('should prioritize API tokens over session tokens', async () => {
      const tokenValue = 'duplicate-token-value';
      
      // Create session token with hash
      const sessionHash = await bcrypt.hash(tokenValue, 10);
      const sessionToken = await global.testUtils.createTestToken(testUser.id, {
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

  describe('Password Validation', () => {
    test('should validate bcrypt password correctly', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      // Update test user with real hash
      await db('users').where('id', testUser.id).update({
        password_hash: hash
      });

      const updatedUser = await db('users').where('id', testUser.id).first();
      
      const isValid = await bcrypt.compare(password, updatedUser.password_hash);
      const isInvalid = await bcrypt.compare('wrongPassword', updatedUser.password_hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should handle password change workflow', async () => {
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';
      
      // Set initial password
      const oldHash = await bcrypt.hash(oldPassword, 10);
      await db('users').where('id', testUser.id).update({
        password_hash: oldHash
      });

      // Verify old password works
      let user = await db('users').where('id', testUser.id).first();
      const oldIsValid = await bcrypt.compare(oldPassword, user.password_hash);
      expect(oldIsValid).toBe(true);

      // Change password
      const newHash = await bcrypt.hash(newPassword, 10);
      await db('users').where('id', testUser.id).update({
        password_hash: newHash
      });

      // Verify password change worked
      user = await db('users').where('id', testUser.id).first();
      const newIsValid = await bcrypt.compare(newPassword, user.password_hash);
      const oldNoLongerValid = await bcrypt.compare(oldPassword, user.password_hash);

      expect(newIsValid).toBe(true);
      expect(oldNoLongerValid).toBe(false);
    });
  });

  describe('JWT Token Handling', () => {
    test('should create and validate JWT tokens', async () => {
      const tokenPayload = {
        id: testUser.id,
        type: 'api',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(testUser.id);
      expect(decoded.type).toBe('api');
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    test('should handle expired JWT tokens', async () => {
      const expiredPayload = {
        id: testUser.id,
        type: 'api',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET);

      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET);
      }).toThrow('jwt expired');
    });

    test('should handle malformed JWT tokens', async () => {
      const malformedToken = 'invalid.jwt.token';

      expect(() => {
        jwt.verify(malformedToken, process.env.JWT_SECRET);
      }).toThrow();
    });
  });
});