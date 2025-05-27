/**
 * Centralized validation utilities for consistent validation across the application
 */
import { security } from './security.js';

export class ValidationHelper {
  /**
   * Validate user data for create/update operations
   */
  static validateUserData(data, isUpdate = false) {
    const errors = {};

    // Name validation
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        errors.name = ['Name is required'];
      } else if (!security.isValidName(data.name)) {
        errors.name = ['Invalid name format (2-50 characters, letters, spaces, hyphens and apostrophes only)'];
      }
    }

    // Email validation
    if (data.email !== undefined) {
      if (!data.email?.trim()) {
        errors.email = ['Email is required'];
      } else if (!security.isValidEmail(data.email)) {
        errors.email = ['Invalid email format'];
      }
    }

    // Password validation (required for create, optional for update)
    if (!isUpdate || data.password !== undefined) {
      if (!data.password && !isUpdate) {
        errors.password = ['Password is required'];
      } else if (data.password) {
        const passwordValidation = security.validatePassword(data.password);
        if (!passwordValidation.isValid) {
          errors.password = passwordValidation.errors;
        }
      }
    }

    // Status validation
    if (data.status !== undefined) {
      const validStatuses = ['active', 'disabled', 'blocked'];
      if (!validStatuses.includes(data.status)) {
        errors.status = ['Invalid status. Must be active, disabled, or blocked'];
      }
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0
    };
  }

  /**
   * Validate role data for create/update operations
   */
  static validateRoleData(data) {
    const errors = {};

    if (!data.name?.trim()) {
      errors.name = ['Role name is required'];
    } else if (!security.isValidUsername(data.name)) {
      errors.name = ['Invalid role name format'];
    }

    if (!data.display_name?.trim()) {
      errors.display_name = ['Display name is required'];
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0
    };
  }

  /**
   * Validate permission array
   */
  static validatePermissions(permissions) {
    if (!Array.isArray(permissions)) {
      return {
        errors: { permissions: ['Permissions must be an array'] },
        isValid: false
      };
    }

    return {
      errors: {},
      isValid: true
    };
  }
}