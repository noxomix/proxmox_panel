import { describe, test, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcrypt';
import { db } from '../src/db.js';
import User from '../src/models/User.js';
import { jwtUtils } from '../src/utils/jwt.js';
import { apiResponse } from '../src/utils/response.js';

describe('UserController Logic Tests', () => {
  let adminUser;
  let regularUser;
  let adminToken;
  let userToken;

  beforeEach(async () => {
    // Create admin user
    adminUser = await global.testUtils.createTestUser({
      name: 'Admin User',
      email: 'admin@test.com',
      role_id: null, // Will need to be set properly later
      status: 'active'
    });

    // Create regular user
    regularUser = await global.testUtils.createTestUser({
      name: 'Regular User',
      email: 'user@test.com', 
      role_id: null, // Will need to be set properly later
      status: 'active'
    });

    // Generate JWT tokens
    adminToken = jwtUtils.generateToken(adminUser, 'session');
    userToken = jwtUtils.generateToken(regularUser, 'session');
  });

  describe('User Model Operations', () => {
    test('should create user with proper validation', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('password123' + (process.env.APPLICATION_SECRET || ''), 12),
        role_id: null,
        status: 'active'
      };

      const userId = await User.create(userData);
      expect(userId).toBeDefined();

      const createdUser = await User.findByEmail(userData.email);
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.role).toBe(userData.role);
      expect(createdUser.status).toBe(userData.status);
    });

    test('should find user by email', async () => {
      const user = await User.findByEmail('admin@test.com');
      expect(user).toBeTruthy();
      expect(user.email).toBe('admin@test.com');
      expect(user.role).toBe('admin');
    });

    test('should find user by identity (email or username)', async () => {
      const userByEmail = await User.findByIdentity('admin@test.com');
      expect(userByEmail).toBeTruthy();
      expect(userByEmail.email).toBe('admin@test.com');
    });

    test('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Admin User',
        status: 'disabled'
      };

      const updatedUser = await User.update(adminUser.id, updateData);
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.status).toBe(updateData.status);
    });

    test('should delete user successfully', async () => {
      const testUser = await global.testUtils.createTestUser({
        email: 'todelete@test.com'
      });

      const result = await User.delete(testUser.id);
      expect(result).toBeGreaterThan(0);

      const deletedUser = await User.findById(testUser.id);
      expect(deletedUser).toBeNull();
    });

    test('should paginate users with search', async () => {
      // Create additional test users
      for (let i = 0; i < 5; i++) {
        await global.testUtils.createTestUser({
          email: `test${i}@example.com`,
          name: `Test User ${i}`
        });
      }

      const result = await User.paginate({
        page: 1,
        limit: 3,
        search: '',
        status: '',
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      expect(result.data).toHaveLength(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.total).toBeGreaterThanOrEqual(7); // 2 original + 5 new
      expect(result.totalPages).toBeGreaterThanOrEqual(3);
    });

    test('should search users by name', async () => {
      await global.testUtils.createTestUser({
        email: 'searchable@test.com',
        name: 'Searchable User'
      });

      const result = await User.paginate({
        page: 1,
        limit: 10,
        search: 'Searchable',
        status: '',
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Searchable User');
    });

    test('should filter users by status', async () => {
      await global.testUtils.createTestUser({
        email: 'disabled@test.com',
        status: 'disabled'
      });

      const result = await User.paginate({
        page: 1,
        limit: 10,
        search: '',
        status: 'disabled',
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe('disabled');
    });

    test('should sort users correctly', async () => {
      // Create users with different names
      await global.testUtils.createTestUser({
        email: 'alice@test.com',
        name: 'Alice'
      });
      await global.testUtils.createTestUser({
        email: 'bob@test.com',
        name: 'Bob'
      });

      const result = await User.paginate({
        page: 1,
        limit: 10,
        search: '',
        status: '',
        sortBy: 'name',
        sortOrder: 'asc'
      });

      // Check if first few users are sorted by name
      const names = result.data.map(user => user.name).slice(0, 3);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('Password Hashing', () => {
    test('should hash password with pepper correctly', async () => {
      const password = 'testPassword123';
      const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
      
      const hashedPassword = await bcrypt.hash(password + pepper, 12);
      
      expect(hashedPassword).toBeTruthy();
      expect(hashedPassword).not.toBe(password);
      
      // Verify password can be checked
      const isValid = await bcrypt.compare(password + pepper, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should fail verification with wrong password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
      
      const hashedPassword = await bcrypt.hash(password + pepper, 12);
      
      const isValid = await bcrypt.compare(wrongPassword + pepper, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT tokens', async () => {
      const token = jwtUtils.generateToken(adminUser, 'session');
      expect(token).toBeTruthy();
      
      const decoded = jwtUtils.decodeToken(token);
      expect(decoded.id).toBe(adminUser.id);
      expect(decoded.type).toBe('session');
    });

    test('should verify JWT tokens correctly', async () => {
      const token = jwtUtils.generateToken(adminUser, 'session');
      
      const isValid = jwtUtils.verifyToken(token);
      expect(isValid).toBeTruthy();
      expect(isValid.id).toBe(adminUser.id);
    });

    test('should reject invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => {
        jwtUtils.verifyToken(invalidToken);
      }).toThrow('Invalid token');
    });
  });

  describe('User Model toJSON', () => {
    test('should exclude password_hash from JSON output', async () => {
      const user = await User.findById(adminUser.id);
      const userJson = user.toJSON();
      
      expect(userJson).toHaveProperty('id');
      expect(userJson).toHaveProperty('name');
      expect(userJson).toHaveProperty('email');
      expect(userJson).toHaveProperty('role');
      expect(userJson).toHaveProperty('status');
      expect(userJson).not.toHaveProperty('password_hash');
    });
  });

  describe('API Response Helper', () => {
    test('should create success response', () => {
      const response = apiResponse.success({ user: 'test' }, 'Success message');
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Success message');
      expect(response.data.user).toBe('test');
    });

    test('should create error response', () => {
      const response = apiResponse.error('Error message');
      
      expect(response.success).toBe(false);
      expect(response.message).toBe('Error message');
    });

    test('should create validation response', () => {
      const errors = { email: ['Invalid email format'] };
      const response = apiResponse.validation(errors);
      
      expect(response.success).toBe(false);
      expect(response.errors).toEqual(errors);
    });
  });
});