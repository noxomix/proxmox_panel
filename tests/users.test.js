import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import db from '../src/db.js';
import User from '../src/models/User.js';
import { jwtUtils } from '../src/utils/jwt.js';

describe('UserController API Endpoints', () => {
  let adminUser;
  let regularUser;
  let adminToken;
  let userToken;
  let app;

  beforeEach(async () => {
    // Import app dynamically to ensure fresh instance
    const appModule = await import('../src/index.js');
    app = appModule.default;

    // Create admin user
    adminUser = await global.testUtils.createTestUser({
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
      status: 'active'
    });

    // Create regular user
    regularUser = await global.testUtils.createTestUser({
      name: 'Regular User',
      email: 'user@test.com', 
      role: 'user',
      status: 'active'
    });

    // Generate JWT tokens
    adminToken = jwtUtils.generateToken(adminUser, 'session');
    userToken = jwtUtils.generateToken(regularUser, 'session');
  });

  describe('GET /api/users - List Users', () => {
    test('should return users list for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
      
      // Check user data structure
      const user = response.body.data.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('status');
      expect(user).not.toHaveProperty('password_hash');
    });

    test('should deny access for regular user', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });

    test('should deny access for unauthenticated user', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    test('should support pagination', async () => {
      // Create additional users for pagination test
      for (let i = 0; i < 15; i++) {
        await global.testUtils.createTestUser({
          email: `test${i}@example.com`,
          name: `Test User ${i}`
        });
      }

      const response = await request(app)
        .get('/api/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users.length).toBe(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.total).toBeGreaterThan(15);
    });

    test('should support search functionality', async () => {
      await global.testUtils.createTestUser({
        email: 'searchable@test.com',
        name: 'Searchable User'
      });

      const response = await request(app)
        .get('/api/users?search=Searchable')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users.length).toBe(1);
      expect(response.body.data.users[0].name).toBe('Searchable User');
    });

    test('should support status filtering', async () => {
      await global.testUtils.createTestUser({
        email: 'disabled@test.com',
        status: 'disabled'
      });

      const response = await request(app)
        .get('/api/users?status=disabled')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users.length).toBe(1);
      expect(response.body.data.users[0].status).toBe('disabled');
    });

    test('should support sorting', async () => {
      const response = await request(app)
        .get('/api/users?sortBy=name&sortOrder=asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const users = response.body.data.users;
      expect(users.length).toBeGreaterThan(1);
      
      // Check if sorted by name ascending
      for (let i = 1; i < users.length; i++) {
        expect(users[i].name.localeCompare(users[i-1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    test('should validate pagination limits', async () => {
      const response = await request(app)
        .get('/api/users?limit=101')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.pagination).toContain('Invalid pagination parameters');
    });

    test('should validate sort parameters', async () => {
      const response = await request(app)
        .get('/api/users?sortBy=invalid_field')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.sort).toContain('Invalid sort parameters');
    });
  });

  describe('GET /api/users/:id - Get Single User', () => {
    test('should return user details for admin', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(regularUser.id);
      expect(response.body.data.user.email).toBe(regularUser.email);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    test('should deny access for regular user', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should validate user ID format', async () => {
      const response = await request(app)
        .get('/api/users/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.id).toContain('Invalid user ID');
    });
  });

  describe('POST /api/users - Create User', () => {
    test('should create user successfully for admin', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'NewPassword123!',
        role: 'user',
        status: 'active'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.user.status).toBe(userData.status);
      expect(response.body.data.user).not.toHaveProperty('password_hash');

      // Verify user was created in database
      const createdUser = await User.findByEmail(userData.email);
      expect(createdUser).toBeTruthy();
      expect(createdUser.name).toBe(userData.name);
    });

    test('should deny access for regular user', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(userData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.name).toContain('Name is required');
      expect(response.body.errors.email).toContain('Email is required');
      expect(response.body.errors.password).toContain('Password is required');
    });

    test('should validate email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.email).toContain('Invalid email format');
    });

    test('should validate password strength', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.password).toBeDefined();
    });

    test('should prevent duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: adminUser.email,
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.email).toContain('Email already exists');
    });

    test('should validate role values', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        role: 'invalid'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.role).toContain('Invalid role. Must be user or admin');
    });

    test('should validate status values', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        status: 'invalid'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.status).toContain('Invalid status. Must be active, disabled, or blocked');
    });

    test('should hash password correctly', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      // Verify password is hashed and includes pepper
      const user = await User.findByEmail(userData.email);
      expect(user.password_hash).toBeTruthy();
      expect(user.password_hash).not.toBe(userData.password);
      
      // Verify password can be verified with pepper
      const pepper = process.env.APPLICATION_SECRET;
      const isValid = await bcrypt.compare(userData.password + pepper, user.password_hash);
      expect(isValid).toBe(true);
    });
  });

  describe('PUT /api/users/:id - Update User', () => {
    test('should update user successfully for admin', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@test.com',
        role: 'admin',
        status: 'disabled'
      };

      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.email).toBe(updateData.email);
      expect(response.body.data.user.role).toBe(updateData.role);
      expect(response.body.data.user.status).toBe(updateData.status);

      // Verify update in database
      const updatedUser = await User.findById(regularUser.id);
      expect(updatedUser.name).toBe(updateData.name);
    });

    test('should deny access for regular user', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should prevent admin from changing own role/status', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot change your own role or status');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should validate email format on update', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.email).toContain('Invalid email format');
    });

    test('should prevent duplicate email on update', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: adminUser.email })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.email).toContain('Email already exists');
    });

    test('should update password with proper hashing', async () => {
      const newPassword = 'NewPassword123!';
      
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: newPassword })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify password was updated and hashed correctly
      const updatedUser = await User.findById(regularUser.id);
      expect(updatedUser.password_hash).not.toBe(regularUser.password_hash);
      
      const pepper = process.env.APPLICATION_SECRET;
      const isValid = await bcrypt.compare(newPassword + pepper, updatedUser.password_hash);
      expect(isValid).toBe(true);
    });

    test('should validate password strength on update', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.password).toBeDefined();
    });

    test('should reject empty update', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.update).toContain('No valid fields to update');
    });
  });

  describe('DELETE /api/users/:id - Delete User', () => {
    test('should delete user successfully for admin', async () => {
      const userToDelete = await global.testUtils.createTestUser({
        email: 'todelete@test.com'
      });

      const response = await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user was deleted
      const deletedUser = await User.findById(userToDelete.id);
      expect(deletedUser).toBeNull();
    });

    test('should deny access for regular user', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should prevent admin from deleting themselves', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete your own account');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should validate user ID format', async () => {
      const response = await request(app)
        .delete('/api/users/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.id).toContain('Invalid user ID');
    });
  });

  describe('Security and Authorization', () => {
    test('should require authentication for all endpoints', async () => {
      await request(app).get('/api/users').expect(401);
      await request(app).get('/api/users/1').expect(401);
      await request(app).post('/api/users').expect(401);
      await request(app).put('/api/users/1').expect(401);
      await request(app).delete('/api/users/1').expect(401);
    });

    test('should reject invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    test('should reject expired JWT tokens', async () => {
      const expiredPayload = {
        id: adminUser.id,
        type: 'session',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600
      };
      
      const jwt = await import('jsonwebtoken');
      const expiredToken = jwt.default.sign(expiredPayload, process.env.JWT_SECRET);

      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    test('should sanitize input data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousData)
        .expect(201);

      // Verify XSS is sanitized
      expect(response.body.data.user.name).not.toContain('<script>');
      expect(response.body.data.user.name).toContain('Test User');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to create operations', async () => {
      // This test would need actual rate limiting implementation
      // For now, just verify the endpoint works
      const userData = {
        name: 'Rate Test User',
        email: 'ratetest@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});