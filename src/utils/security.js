/**
 * Security utilities for input validation and sanitization
 */
import crypto from 'crypto';

export const security = {
  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>\"'%;()&+]/g, '') // Remove potentially dangerous characters
      .substring(0, 255); // Limit length
  },

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Validate username format
   */
  isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  },

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const errors = [];
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Generate cryptographically secure JWT ID
   */
  generateSecureJti() {
    return crypto.randomBytes(16).toString('hex');
  },

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  },

  /**
   * Add artificial delay to prevent timing attacks
   */
  async addSecurityDelay(minMs = 100, maxMs = 300) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  },

  /**
   * Validate and sanitize login credentials
   */
  validateLoginCredentials(identity, password) {
    const errors = {};

    // Validate identity (email or username)
    if (!identity) {
      errors.identity = ['Identity is required'];
    } else {
      const sanitizedIdentity = this.sanitizeInput(identity);
      
      // Check if it's email or username format
      const isEmail = sanitizedIdentity.includes('@');
      if (isEmail && !this.isValidEmail(sanitizedIdentity)) {
        errors.identity = ['Invalid email format'];
      } else if (!isEmail && !this.isValidUsername(sanitizedIdentity)) {
        errors.identity = ['Invalid username format'];
      }
    }

    // Validate password (for login, allow existing shorter passwords)
    if (!password) {
      errors.password = ['Password is required'];
    } else if (password.length > 128) {
      errors.password = ['Password too long'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedIdentity: identity ? this.sanitizeInput(identity) : null
    };
  },

  /**
   * Validate input based on type
   */
  validateInput(input, type) {
    if (!input || typeof input !== 'string') return false;
    
    switch (type) {
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
      case 'alphanumeric':
        return /^[a-zA-Z0-9]+$/.test(input);
      case 'alphanumeric_underscore':
        return /^[a-zA-Z0-9_]+$/.test(input);
      case 'text':
        return input.length > 0 && input.length <= 255;
      default:
        return false;
    }
  },

  /**
   * Check if request looks suspicious
   */
  analyzeSuspiciousActivity(c) {
    const userAgent = c.req.header('user-agent') || '';
    const acceptHeader = c.req.header('accept') || '';
    
    // Common bot signatures
    const botSignatures = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|php/i,
      /postman|insomnia/i
    ];
    
    const isSuspicious = botSignatures.some(pattern => pattern.test(userAgent)) ||
                        acceptHeader === '' ||
                        userAgent === '';
    
    return {
      isSuspicious,
      userAgent: userAgent.substring(0, 200), // Limit length
      reason: isSuspicious ? 'Suspicious user agent or missing headers' : null
    };
  }
};