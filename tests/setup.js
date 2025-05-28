import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import dotenv from 'dotenv';
import { db } from '../src/db.js';

// Load test environment variables
dotenv.config({ path: '.env.testing' });

// Test database setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Run migrations
  await db.migrate.latest();
  
  // Run seeds to create basic roles and permissions
  await db.seed.run();
});

// Clean up before each test
beforeEach(async () => {
  // Clear all tables in correct order (foreign keys)
  await db('tokens').del();
  await db('user_permissions').del();
  await db('users').del();
  // Don't delete roles, permissions, and role_permissions - they are seeded once
});

// Cleanup after all tests
afterAll(async () => {
  await db.destroy();
});

// Global test utilities
global.testUtils = {
  // Get role by name
  getRoleByName: async (roleName) => {
    return await db('roles').where('name', roleName).first();
  },
  
  // Get permission by name
  getPermissionByName: async (permissionName) => {
    return await db('permissions').where('name', permissionName).first();
  },
  
  // Assign permissions to user
  assignUserPermissions: async (userId, permissionNames) => {
    const permissions = await db('permissions')
      .whereIn('name', permissionNames)
      .select('id');
    
    const userPermissions = permissions.map(p => ({
      user_id: userId,
      permission_id: p.id,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    if (userPermissions.length > 0) {
      await db('user_permissions').insert(userPermissions);
    }
  },
  createTestUser: async (overrides = {}) => {
    // Generate unique identifiers to avoid duplicates
    const uniqueId = Math.random().toString(36).substr(2, 9);
    
    // Get default role if not specified
    let role_id = overrides.role_id;
    if (role_id === undefined) {
      const userRole = await db('roles').where('name', 'user').first();
      role_id = userRole ? userRole.id : null;
    }
    
    const userData = {
      name: 'Test User',
      username: `testuser_${uniqueId}`,
      email: `test_${uniqueId}@example.com`,
      password_hash: '$2b$10$test.hash.example', // bcrypt hash for 'password123'
      role_id: role_id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
    
    const [userId] = await db('users').insert(userData);
    
    // Get the created user by email (safer with UUID)
    const createdUser = await db('users').where('email', userData.email).first();
    return createdUser;
  },
  
  createTestToken: async (userId, overrides = {}) => {
    // Generate unique token for each test
    const uniqueToken = `test-token-${Math.random().toString(36).substr(2, 9)}`;
    
    const tokenData = {
      user_id: userId,
      type: 'session',
      token: overrides.type === 'api' ? (overrides.token || uniqueToken) : null,
      jwt_id: overrides.type === 'session' ? (overrides.jwt_id || uniqueToken) : null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
    
    await db('tokens').insert(tokenData);
    
    // Get the created token
    const createdToken = await db('tokens')
      .where('user_id', userId)
      .where('type', tokenData.type)
      .orderBy('created_at', 'desc')
      .first();
    
    return createdToken;
  }
};