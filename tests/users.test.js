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
  let adminRole;
  let userRole;

  beforeEach(async () => {
    // Get roles
    adminRole = await global.testUtils.getRoleByName('admin');
    userRole = await global.testUtils.getRoleByName('user');
    
    // Create admin user
    adminUser = await global.testUtils.createTestUser({
      name: 'Admin User',
      email: 'admin@test.com',
      role_id: adminRole.id,
      status: 'active'
    });

    // Create regular user
    regularUser = await global.testUtils.createTestUser({
      name: 'Regular User',
      email: 'user@test.com', 
      role_id: userRole.id,
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
        role_id: userRole.id,
        status: 'active'
      };

      const userId = await User.create(userData);
      expect(userId).toBeDefined();

      const createdUser = await User.findByEmail(userData.email);
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.role_id).toBe(userData.role_id);
      expect(createdUser.status).toBe(userData.status);
    });

    test('should find user by email', async () => {
      const user = await User.findByEmail('admin@test.com');
      expect(user).toBeTruthy();
      expect(user.email).toBe('admin@test.com');
      expect(user.role_id).toBe(adminRole.id);
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
        limit: 5,
        search: 'Test'
      });

      expect(result.data).toBeInstanceOf(Array);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.total).toBeGreaterThanOrEqual(5);
    });

    test('should verify password correctly', async () => {
      const password = 'password123';
      const pepper = process.env.APPLICATION_SECRET || '';
      const hashedPassword = await bcrypt.hash(password + pepper, 12);

      const testUser = await global.testUtils.createTestUser({
        email: 'passtest@example.com',
        password_hash: hashedPassword
      });

      // User model doesn't have verifyPassword static method
      // Password verification is done differently in the actual app
      const isValid = await bcrypt.compare(password + pepper, testUser.password_hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('wrongpassword' + pepper, testUser.password_hash);
      expect(isInvalid).toBe(false);
    });

    test('should check user permissions correctly', async () => {
      // Admin should have login permission
      const hasPermission = await User.hasPermission(adminUser.id, 'login');
      expect(hasPermission).toBe(true);

      // Regular user should have limited permissions
      const hasAdminPermission = await User.hasPermission(regularUser.id, 'user_delete');
      expect(hasAdminPermission).toBe(false);
    });

    test('should get user permissions with role permissions', async () => {
      const permissions = await User.getPermissions(adminUser.id);
      expect(permissions).toBeInstanceOf(Array);
      expect(permissions.length).toBeGreaterThan(0);
      
      // Admin should have all permissions
      const permissionNames = permissions.map(p => p.name);
      expect(permissionNames).toContain('login');
      expect(permissionNames).toContain('user_create');
      expect(permissionNames).toContain('user_delete');
    });

    test('should get role permissions separately', async () => {
      const rolePermissions = await User.getRolePermissions(adminUser.id);
      expect(rolePermissions).toBeInstanceOf(Array);
      expect(rolePermissions.length).toBeGreaterThan(0);
    });

    test('should handle direct permissions', async () => {
      // Assign direct permission to user
      await global.testUtils.assignUserPermissions(regularUser.id, ['user_index']);
      
      // Check that user now has this permission
      const hasPermission = await User.hasPermission(regularUser.id, 'user_index');
      expect(hasPermission).toBe(true);
      
      // Get direct permissions
      const directPermissions = await User.getDirectPermissions(regularUser.id);
      expect(directPermissions).toBeInstanceOf(Array);
      expect(directPermissions.map(p => p.name)).toContain('user_index');
    });

    test('should sync permissions correctly', async () => {
      const permission1 = await global.testUtils.getPermissionByName('user_index');
      const permission2 = await global.testUtils.getPermissionByName('user_show');
      
      // Sync permissions
      await User.syncPermissions(regularUser.id, [permission1.id, permission2.id]);
      
      // Check synced permissions
      const directPermissions = await User.getDirectPermissions(regularUser.id);
      const permissionIds = directPermissions.map(p => p.id);
      
      expect(permissionIds).toContain(permission1.id);
      expect(permissionIds).toContain(permission2.id);
      expect(permissionIds.length).toBe(2);
      
      // Sync again with only one permission
      await User.syncPermissions(regularUser.id, [permission1.id]);
      
      const updatedPermissions = await User.getDirectPermissions(regularUser.id);
      const updatedIds = updatedPermissions.map(p => p.id);
      
      expect(updatedIds).toContain(permission1.id);
      expect(updatedIds).not.toContain(permission2.id);
      expect(updatedIds.length).toBe(1);
    });
  });

  describe('Security Validations', () => {
    test('should handle SQL injection attempts in queries', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const result = await User.paginate({
        page: 1,
        limit: 10,
        search: maliciousInput
      });
      
      expect(result.data).toBeInstanceOf(Array);
      
      // Verify tables still exist
      const tablesExist = await db.schema.hasTable('users');
      expect(tablesExist).toBe(true);
    });

    test('should not expose password_hash in JSON output', async () => {
      const user = await User.findById(adminUser.id);
      const userJson = user.toJSON();
      
      expect(userJson).toHaveProperty('id');
      expect(userJson).toHaveProperty('name');
      expect(userJson).toHaveProperty('email');
      expect(userJson).toHaveProperty('role_id');
      expect(userJson).toHaveProperty('role_name');
      expect(userJson).toHaveProperty('role_display_name');
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