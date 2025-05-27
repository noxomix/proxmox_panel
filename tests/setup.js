import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import dotenv from 'dotenv';
import db from '../src/db.js';

// Load test environment variables
dotenv.config({ path: '.env.testing' });

// Test database setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Run migrations
  await db.migrate.latest();
});

// Clean up before each test
beforeEach(async () => {
  // Clear all tables
  await db('tokens').del();
  await db('users').del();
});

// Cleanup after all tests
afterAll(async () => {
  await db.destroy();
});

// Global test utilities
global.testUtils = {
  createTestUser: async (overrides = {}) => {
    // Generate unique identifiers to avoid duplicates
    const uniqueId = Math.random().toString(36).substr(2, 9);
    
    const userData = {
      name: 'Test User',
      username: `testuser_${uniqueId}`,
      email: `test_${uniqueId}@example.com`,
      password_hash: '$2b$10$test.hash.example', // bcrypt hash for 'password123'
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
    
    await db('users').insert(userData);
    
    // Get the created user by email since MySQL with UUID doesn't return the ID
    const createdUser = await db('users').where('email', userData.email).first();
    return createdUser;
  },
  
  createTestToken: async (userId, overrides = {}) => {
    // Generate unique hash for each token to avoid duplicates
    const uniqueHash = `$2b$10$test.token.hash.${Math.random().toString(36).substr(2, 9)}`;
    
    const tokenData = {
      user_id: userId,
      type: 'session',
      token_hash: uniqueHash,
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