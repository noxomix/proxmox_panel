import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Hono } from 'hono';
import db from '../src/db.js';
import auth from '../src/controllers/auth/AuthController.js';
import User from '../src/models/User.js';
import Token from '../src/models/Token.js';

// Create test app and wrap it for Supertest
const app = new Hono();
app.route('/auth', auth);

// Wrap Hono app for Supertest compatibility
const testApp = (req, res) => {
  return app.fetch(req).then(response => {
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.set(key, value);
    });
    return response.text().then(text => {
      if (response.headers.get('content-type')?.includes('application/json')) {
        res.json(JSON.parse(text));
      } else {
        res.send(text);
      }
    });
  });
};

describe('Authentication Controller', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user with known password
    const passwordHash = await bcrypt.hash('password123', 10);
    testUser = await global.testUtils.createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: passwordHash
    });

    // Create auth token for authenticated requests
    const tokenPayload = {
      id: testUser.id,
      type: 'session',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    authToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);
    
    // Store token in database
    const tokenHash = await bcrypt.hash(authToken, 10);
    await global.testUtils.createTestToken(testUser.id, {
      token_hash: tokenHash,
      type: 'session'
    });
  });

  describe('Password Change', () => {
    test('should change password with valid current password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify password was actually changed
      const updatedUser = await User.findById(testUser.id);
      const isNewPasswordValid = await bcrypt.compare('newpassword456', updatedUser.password_hash);
      expect(isNewPasswordValid).toBe(true);
    });

    test('should fail with incorrect current password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(401);
    });

    test('should fail with missing fields', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123'
          // missing newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password and new password are required');
    });

    test('should fail with short new password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: '123' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('New password must be at least 6 characters long');
    });
  });

  describe('API Token Generation', () => {
    test('should generate new API token when none exists', async () => {
      const response = await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('API token generated successfully');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.type).toBe('api');
      expect(response.body.data.expires_at).toBeDefined();

      // Verify token was stored in database
      const apiToken = await Token.getLatestApiToken(testUser.id);
      expect(apiToken).toBeTruthy();
      expect(apiToken.type).toBe('api');
    });

    test('should regenerate API token and delete old one', async () => {
      // First, create an existing API token
      const firstResponse = await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(firstResponse.status).toBe(200);
      const firstToken = firstResponse.body.data.token;

      // Wait a moment to ensure different creation times
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate a new token (should delete the old one)
      const secondResponse = await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.success).toBe(true);
      const secondToken = secondResponse.body.data.token;

      // Tokens should be different
      expect(secondToken).not.toBe(firstToken);

      // Should only have one API token in database
      const apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe(secondToken);
    });

    test('should handle multiple regenerations correctly', async () => {
      // Generate multiple tokens in sequence
      const tokens = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/auth/generate-api-token')
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(response.status).toBe(200);
        tokens.push(response.body.data.token);
        
        // Wait a moment between generations
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // All tokens should be different
      expect(new Set(tokens)).toHaveLength(3);

      // Should only have the latest token in database
      const apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      
      expect(apiTokens).toHaveLength(1);
      expect(apiTokens[0].token).toBe(tokens[2]); // Latest token
    });

    test('should create API token with 365-day expiry', async () => {
      const beforeRequest = new Date();
      
      const response = await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const expiresAt = new Date(response.body.data.expires_at);
      const expectedExpiry = new Date(beforeRequest.getTime() + (365 * 24 * 60 * 60 * 1000));
      
      // Allow 1 minute tolerance for timing differences
      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000);
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .post('/auth/generate-api-token');

      expect(response.status).toBe(401);
    });

    test('should store IP address and user agent', async () => {
      const response = await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${authToken}`)
        .set('User-Agent', 'test-browser/1.0')
        .set('X-Forwarded-For', '192.168.1.100');

      expect(response.status).toBe(200);

      const apiToken = await Token.getLatestApiToken(testUser.id);
      expect(apiToken.ip_address).toBe('192.168.1.100');
      expect(apiToken.user_agent).toBe('test-browser/1.0');
    });
  });

  describe('Get API Token', () => {
    test('should return current API token', async () => {
      // First generate a token
      const generateResponse = await request(app)
        .post('/auth/generate-api-token')
        .set('Authorization', `Bearer ${authToken}`);
      
      const generatedToken = generateResponse.body.data.token;

      // Then get it
      const response = await request(app)
        .get('/auth/api-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe(generatedToken);
      expect(response.body.data.expires_at).toBeDefined();
    });

    test('should return null when no API token exists', async () => {
      const response = await request(app)
        .get('/auth/api-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
      expect(response.body.message).toBe('No active API token found');
    });

    test('should not return expired API tokens', async () => {
      // Create an expired API token directly in database
      await global.testUtils.createTestToken(testUser.id, {
        type: 'api',
        token: 'expired-token-123',
        expires_at: new Date(Date.now() - 1000), // 1 second ago
        token_hash: null
      });

      const response = await request(app)
        .get('/auth/api-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
    });
  });

  describe('Session Management', () => {
    test('should get active sessions', async () => {
      // Create additional test sessions
      await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        ip_address: '192.168.1.100',
        user_agent: 'Chrome/120.0'
      });

      const response = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // Original + additional
      
      const sessions = response.body.data;
      expect(sessions[0]).toHaveProperty('id');
      expect(sessions[0]).toHaveProperty('ip_address');
      expect(sessions[0]).toHaveProperty('user_agent');
      expect(sessions[0]).toHaveProperty('created_at');
      expect(sessions[0]).toHaveProperty('is_current');
    });

    test('should revoke specific session', async () => {
      // Create additional session to revoke
      const additionalSession = await global.testUtils.createTestToken(testUser.id, {
        type: 'session',
        ip_address: '192.168.1.200'
      });

      const response = await request(app)
        .delete(`/auth/sessions/${additionalSession.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Session revoked successfully');

      // Verify session was deleted
      const remainingSessions = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'session');
      
      expect(remainingSessions).toHaveLength(1); // Only the current session
    });

    test('should revoke all other sessions', async () => {
      // Create multiple additional sessions
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });
      await global.testUtils.createTestToken(testUser.id, { type: 'session' });

      const response = await request(app)
        .delete('/auth/sessions/all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should still have the current session
      const remainingSessions = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'session');
      
      expect(remainingSessions).toHaveLength(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock database error by closing connection temporarily
      await db.destroy();
      
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    test('should handle malformed JWT tokens', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', 'Bearer invalid-token-format')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(401);
    });

    test('should handle expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id, type: 'session', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET
      );

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(401);
    });

    test('should handle non-existent user in token', async () => {
      const invalidUserToken = jwt.sign(
        { id: 99999, type: 'session', exp: Math.floor(Date.now() / 1000) + 3600 },
        process.env.JWT_SECRET
      );

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${invalidUserToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(401);
    });

    test('should handle concurrent API token generation', async () => {
      // Simulate concurrent requests
      const promises = Array(5).fill().map(() =>
        request(app)
          .post('/auth/generate-api-token')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should only have one API token in the end
      const apiTokens = await db('tokens')
        .where('user_id', testUser.id)
        .where('type', 'api');
      
      expect(apiTokens).toHaveLength(1);
    });
  });
});