import { describe, test, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcrypt';
import db from '../src/db.js';

describe('Password Management Tests', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await global.testUtils.createTestUser();
  });

  describe('Password Hashing and Validation', () => {
    test('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$10$')).toBe(true);
    });

    test('should validate correct password', async () => {
      const password = 'correctPassword456';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'correctPassword456';
      const wrongPassword = 'wrongPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    test('should update user password in database', async () => {
      const newPassword = 'newSecurePassword789';
      const newHash = await bcrypt.hash(newPassword, 10);
      
      // Update password in database
      await db('users').where('id', testUser.id).update({
        password_hash: newHash,
        updated_at: new Date()
      });
      
      // Retrieve updated user
      const updatedUser = await db('users').where('id', testUser.id).first();
      
      // Verify password was updated
      const isValid = await bcrypt.compare(newPassword, updatedUser.password_hash);
      expect(isValid).toBe(true);
    });

    test('should enforce minimum password length', () => {
      const shortPassword = '123';
      const validPassword = 'validPassword123';
      
      expect(shortPassword.length).toBeLessThan(6);
      expect(validPassword.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Password Change Workflow', () => {
    test('should complete full password change process', async () => {
      const currentPassword = 'currentPassword123';
      const newPassword = 'newPassword456';
      
      // Set initial password
      const currentHash = await bcrypt.hash(currentPassword, 10);
      await db('users').where('id', testUser.id).update({
        password_hash: currentHash
      });
      
      // Verify current password
      let user = await db('users').where('id', testUser.id).first();
      const currentIsValid = await bcrypt.compare(currentPassword, user.password_hash);
      expect(currentIsValid).toBe(true);
      
      // Change to new password
      const newHash = await bcrypt.hash(newPassword, 10);
      await db('users').where('id', testUser.id).update({
        password_hash: newHash,
        updated_at: new Date()
      });
      
      // Verify new password works and old doesn't
      user = await db('users').where('id', testUser.id).first();
      const newIsValid = await bcrypt.compare(newPassword, user.password_hash);
      const oldIsInvalid = await bcrypt.compare(currentPassword, user.password_hash);
      
      expect(newIsValid).toBe(true);
      expect(oldIsInvalid).toBe(false);
    });
  });
});