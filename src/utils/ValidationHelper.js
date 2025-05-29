/**
 * Centralized validation utilities for consistent validation across the application
 */
import { security } from './security.js';

class ValidationHelper {
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

  /**
   * Validate namespace data
   */
  static validateNamespace(data) {
    const errors = {};

    // Name validation (only if provided)
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        errors.name = ['Namespace name is required'];
      } else if (!/^[a-zA-Z0-9_-]+$/.test(data.name)) {
        errors.name = ['Namespace name can only contain letters, numbers, hyphens and underscores'];
      } else if (data.name.length < 2 || data.name.length > 50) {
        errors.name = ['Namespace name must be between 2 and 50 characters'];
      }
    }

    // Domain validation (optional field)
    if (data.domain !== undefined && data.domain !== null && data.domain.trim()) {
      const domain = data.domain.trim();
      
      // Split domain and port
      const parts = domain.split(':');
      const domainPart = parts[0];
      const portPart = parts[1];
      
      // Check if it's a valid domain/subdomain
      // Must have at least one dot for a valid domain (except localhost)
      const isLocalhost = domainPart.toLowerCase() === 'localhost';
      const hasDot = domainPart.includes('.');
      
      if (!isLocalhost && !hasDot) {
        errors.domain = ['Please enter a valid domain (e.g., example.com) or subdomain (e.g., sub.example.com)'];
      } else if (!isLocalhost) {
        // Validate domain format
        const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        if (!domainRegex.test(domainPart)) {
          errors.domain = ['Invalid domain format. Domain must contain valid characters and a proper TLD (e.g., .com, .org)'];
        }
      }
      
      // Validate port if present
      if (portPart !== undefined) {
        if (!/^\d+$/.test(portPart)) {
          errors.domain = ['Port must be a number'];
        } else {
          const port = parseInt(portPart);
          if (port < 1 || port > 65535) {
            errors.domain = ['Port must be between 1 and 65535'];
          }
        }
      }
      
      // Additional validation for invalid patterns
      if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
        errors.domain = ['Domain cannot start or end with a dot'];
      }
      if (domainPart.includes('..')) {
        errors.domain = ['Domain cannot contain consecutive dots'];
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

export default ValidationHelper;