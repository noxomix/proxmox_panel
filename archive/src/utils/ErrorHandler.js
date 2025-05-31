/**
 * Centralized error handling for consistent API responses
 */
import { apiResponse } from './response.js';

export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ErrorHandler {
  /**
   * Handle controller errors with consistent formatting
   */
  static handleControllerError(error, context = '') {
    console.error(`${context} error:`, error);

    if (error instanceof ValidationError) {
      return {
        response: apiResponse.validation(error.errors),
        status: 400
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        response: apiResponse.forbidden(error.message),
        status: 403
      };
    }

    if (error.message?.includes('not found')) {
      return {
        response: apiResponse.error(error.message),
        status: 404
      };
    }

    return {
      response: apiResponse.error(error.message || `Failed to ${context.toLowerCase()}`),
      status: 500
    };
  }

  /**
   * Wrapper for controller functions with automatic error handling
   */
  static wrapController(fn, context) {
    return async (c) => {
      try {
        return await fn(c);
      } catch (error) {
        const { response, status } = this.handleControllerError(error, context);
        return c.json(response, status);
      }
    };
  }

  /**
   * Validate required parameters and throw if missing
   */
  static validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      const errors = {};
      missing.forEach(field => {
        errors[field] = [`${field} is required`];
      });
      throw new ValidationError(errors);
    }
  }
}