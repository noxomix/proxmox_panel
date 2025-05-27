/**
 * Password hashing and validation utilities
 */
import bcrypt from 'bcrypt';
import { security } from './security.js';

export class PasswordHelper {
  /**
   * Hash password with pepper and salt
   */
  static async hashPassword(password) {
    const pepper = process.env.APPLICATION_SECRET;
    if (!pepper) {
      throw new Error('APPLICATION_SECRET not configured');
    }

    const saltRounds = 12;
    return await bcrypt.hash(password + pepper, saltRounds);
  }

  /**
   * Verify password against hash with pepper
   */
  static async verifyPassword(password, hash) {
    const pepper = process.env.APPLICATION_SECRET;
    if (!pepper) {
      throw new Error('APPLICATION_SECRET not configured');
    }

    return await bcrypt.compare(password + pepper, hash);
  }

  /**
   * Validate password requirements
   */
  static validatePassword(password) {
    return security.validatePassword(password);
  }
}