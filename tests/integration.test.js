import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { Hono } from 'hono';
import auth from '../src/controllers/auth/AuthController.js';
import db from '../src/db.js';

// Create test app
const app = new Hono();
app.route('/auth', auth);

describe('Integration Tests - Full Authentication Flow', () => {
  let testUser;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    testUser = await global.testUtils.createTestUser({
      username: 'integrationuser',
      email: 'integration@example.com',
      password_hash: passwordHash
    });
  });

  describe('Complete User Session Lifecycle', () => {
    test('should handle complete user authentication and token management flow', async () => {
      // 1. Login user
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      
      const sessionToken = loginResponse.body.data.token;

      // 2. Generate API token
      const apiTokenResponse = await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(apiTokenResponse.status).toBe(200);
      const firstApiToken = apiTokenResponse.body.data.token;

      // 3. Verify API token exists
      const getTokenResponse = await request(app)
        .get('/auth/api-token')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(getTokenResponse.status).toBe(200);
      expect(getTokenResponse.body.data.token).toBe(firstApiToken);

      // 4. Regenerate API token (should delete old one)
      const regenResponse = await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(regenResponse.status).toBe(200);
      const secondApiToken = regenResponse.body.data.token;
      expect(secondApiToken).not.toBe(firstApiToken);

      // 5. Verify only new token exists in database
      const apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe(secondApiToken);

      // 6. Change password
      const passwordResponse = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newPassword456'
        });

      expect(passwordResponse.status).toBe(200);

      // 7. Verify old password no longer works for new login
      const oldPasswordLogin = await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'password123'
        });

      expect(oldPasswordLogin.status).toBe(401);

      // 8. Verify new password works
      const newPasswordLogin = await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'newPassword456'
        });

      expect(newPasswordLogin.status).toBe(200);

      // 9. Get sessions and verify multiple sessions exist
      const sessionsResponse = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(sessionsResponse.status).toBe(200);
      expect(sessionsResponse.body.data.length).toBeGreaterThan(1);

      // 10. Revoke all other sessions
      const revokeAllResponse = await request(app)
        .delete('/auth/sessions/all')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(revokeAllResponse.status).toBe(200);

      // 11. Verify only current session remains
      const finalSessionsResponse = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(finalSessionsResponse.status).toBe(200);
      expect(finalSessionsResponse.body.data).toHaveLength(1);
      expect(finalSessionsResponse.body.data[0].is_current).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent API token regenerations safely', async () => {
      // Login to get session token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'password123'
        });

      const sessionToken = loginResponse.body.data.token;

      // Perform concurrent API token generations
      const concurrentRequests = Array(10).fill().map(() =>
        request(app)
          .post('/auth/generate-api-token')
          .set('Authorization', `Bearer ${sessionToken}`)
      );

      const responses = await Promise.all(concurrentRequests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
      });

      // Should end up with exactly one API token
      const finalTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');

      expect(finalTokens).toHaveLength(1);
    });

    test('should handle concurrent password changes safely', async () => {
      // Login to get session token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'password123'
        });

      const sessionToken = loginResponse.body.data.token;

      // Perform concurrent password change attempts
      const concurrentRequests = Array(5).fill().map((_, index) =>
        request(app)
          .post('/auth/change-password')
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({
            currentPassword: 'password123',
            newPassword: `newPassword${index}`
          })
      );

      const responses = await Promise.all(concurrentRequests);

      // At least one should succeed, others may fail due to password being changed
      const successfulResponses = responses.filter(r => r.status === 200);
      const failedResponses = responses.filter(r => r.status !== 200);

      expect(successfulResponses.length).toBeGreaterThan(0);
      
      if (failedResponses.length > 0) {
        failedResponses.forEach(response => {
          expect(response.body.message).toBe('Current password is incorrect');
        });
      }
    });
  });

  describe('Security Edge Cases', () => {
    test('should prevent session token reuse after logout', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'password123'
        });

      const sessionToken = loginResponse.body.data.token;

      // Use token successfully
      const beforeLogout = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(beforeLogout.status).toBe(200);

      // Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(logoutResponse.status).toBe(200);

      // Try to use token after logout
      const afterLogout = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(afterLogout.status).toBe(401);
    });

    test('should handle malicious token manipulation', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'password123'
        });

      const validToken = loginResponse.body.data.token;

      // Test with modified token
      const manipulatedToken = validToken.slice(0, -5) + 'XXXXX';
      
      const response = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${manipulatedToken}`);

      expect(response.status).toBe(401);
    });

    test('should handle API token expiry correctly', async () => {
      // Create an expired API token directly
      const expiredToken = await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'expired-api-token-test',
        expires_at: new Date(Date.now() - 1000) // 1 second ago
      });

      // Try to find expired token
      const foundToken = await db('tokens')
        .where('token', 'expired-api-token-test')
        .where('type', 'api')
        .where('expires_at', '>', new Date())
        .first();

      expect(foundToken).toBeUndefined();
    });
  });

  describe('Database Consistency', () => {
    test('should maintain referential integrity during user operations', async () => {
      // Login and create multiple tokens
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'password123'
        });

      const sessionToken = loginResponse.body.data.token;

      // Generate API token
      await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${sessionToken}`);

      // Create additional sessions
      await request(app)
        .post('/auth/login')
        .send({
          identity: 'integrationuser',
          password: 'password123'
        });

      // Verify all tokens belong to correct user
      const allTokens = await db('tokens').where('user_id', testUser.id);
      
      expect(allTokens.length).toBeGreaterThan(1);
      allTokens.forEach(token => {
        expect(token.user_id).toBe(testUser.id);
        expect(token.created_at).toBeInstanceOf(Date);
        expect(token.updated_at).toBeInstanceOf(Date);
        expect(token.expires_at).toBeInstanceOf(Date);
        expect(['session', 'api']).toContain(token.type);
      });
    });

    test('should handle cleanup operations correctly', async () => {
      // Create mix of valid and expired tokens
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        expires_at: new Date(Date.now() - 1000)
      });
      
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        expires_at: new Date(Date.now() + 86400000)
      });

      const beforeCleanup = await db('tokens').where('user_id', testUser.id);
      expect(beforeCleanup).toHaveLength(2);

      // Run cleanup
      await db('tokens').where('expires_at', '<', new Date()).del();

      const afterCleanup = await db('tokens').where('user_id', testUser.id);
      expect(afterCleanup).toHaveLength(1);
      expect(afterCleanup[0].type).toBe('api');
    });
  });
});