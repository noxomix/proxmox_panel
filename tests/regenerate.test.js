import { describe, test, expect, beforeEach } from '@jest/globals';
import db from '../src/db.js';
import Token from '../src/models/Token.js';

describe('API Token Regeneration Tests', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await global.testUtils.createTestUser();
  });

  describe('Delete Old Tokens Before Creating New', () => {
    test('should delete existing API token when regenerating', async () => {
      // Step 1: Create initial API token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'initial-api-token',
        token_hash: null
      });
      
      // Verify initial token exists
      let apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe('initial-api-token');
      
      // Step 2: Delete old tokens (regeneration step)
      await Token.deleteApiTokensByUserId(testUser.id);
      
      // Verify old token is deleted
      apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(0);
      
      // Step 3: Create new API token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'new-api-token',
        token_hash: null
      });
      
      // Verify only new token exists
      apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe('new-api-token');
    });

    test('should handle multiple regenerations', async () => {
      // Simulate 3 regenerations
      for (let i = 1; i <= 3; i++) {
        // Delete existing tokens
        await Token.deleteApiTokensByUserId(testUser.id);
        
        // Create new token
        await global.testUtils.createTestToken(testUser.id, {
          type: 'api',
          token: `api-token-generation-${i}`,
          token_hash: null
        });
        
        // Verify only one token exists
        const apiTokens = await db('tokens')
          .where('user_id', testUser.id)
          .where('type', 'api');
        expect(apiTokens).toHaveLength(1);
        expect(apiTokens[0].token).toBe(`api-token-generation-${i}`);
      }
    });

    test('should only delete API tokens, not session tokens', async () => {
      // Create session tokens
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      
      // Create API token
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'api-token-to-delete',
        token_hash: null
      });
      
      // Verify all tokens exist
      let allTokens = await db('tokens').where('user_id', testUser.id);
      expect(allTokens).toHaveLength(3);
      
      // Delete only API tokens
      await Token.deleteApiTokensByUserId(testUser.id);
      
      // Verify session tokens remain, API token gone
      const sessionTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'session');
      const apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      
      expect(sessionTokens).toHaveLength(2);
      expect(apiTokens).toHaveLength(0);
    });

    test('should work independently for different users', async () => {
      const otherUser = await global.testUtils.createTestUser();
      
      // Create API tokens for both users
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'user1-token',
        token_hash: null
      });
      await global.testUtils.createTestToken(otherUser.id, {
        type: 'api',
        token: 'user2-token',
        token_hash: null
      });
      
      // Delete tokens for first user only
      await Token.deleteApiTokensByUserId(testUser.id);
      
      // Verify first user has no tokens, second user still has token
      const user1Tokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      const user2Tokens = await db('tokens')
        .where('user_id', otherUser.id)
        .where('type', 'api');
      
      expect(user1Tokens).toHaveLength(0);
      expect(user2Tokens).toHaveLength(1);
      expect(user2Tokens[0].token).toBe('user2-token');
    });

    test('should handle regeneration when no existing tokens', async () => {
      // Ensure no API tokens exist
      let apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(0);
      
      // Delete operation should not fail
      await expect(Token.deleteApiTokensByUserId(testUser.id)).resolves.toBeDefined();
      
      // Create new token after "deletion"
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'first-ever-token',
        token_hash: null
      });
      
      // Verify token was created
      apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe('first-ever-token');
    });
  });

  describe('Complete Regeneration Workflow', () => {
    test('should simulate backend generateApiToken logic', async () => {
      // Initial state - no tokens
      let apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(0);
      
      // First generation
      await Token.deleteApiTokensByUserId(testUser.id); // Safe to call
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'first-generation',
        token_hash: null
      });
      
      apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(1);
      
      // Second generation (regenerate)
      await Token.deleteApiTokensByUserId(testUser.id); // Deletes first-generation
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'second-generation',
        token_hash: null
      });
      
      apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe('second-generation');
      
      // Third generation (regenerate again)
      await Token.deleteApiTokensByUserId(testUser.id); // Deletes second-generation
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'third-generation',
        token_hash: null
      });
      
      apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe('third-generation');
    });
  });
});