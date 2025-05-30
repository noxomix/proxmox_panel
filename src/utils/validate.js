import * as yup from 'yup';
import { security } from './security.js';

/**
 * Efficient validate function with direct Yup schema syntax
 * Usage: let valid = validate(data, {field: yup.string().required(), field: yup.number().min(1)})
 */

// Helper to create searchfield schema
export const searchfield = (maxLength = 100) => {
  return yup.string().default('').transform((value) => {
    if (!value) return '';
    // Sanitize and escape SQL LIKE wildcards
    return security.sanitizeInput(value.trim()).replace(/[%_]/g, '\\$&');
  }).max(maxLength);
};

// Helper to create enum schema with empty default
export const oneOfWithEmpty = (...values) => {
  return yup.string().default('').oneOf(['', ...values]);
};

/**
 * Main validate function
 * @param {Object} data - Data to validate
 * @param {Object} rules - Rules object {field: yup.schema()}
 * @returns {Object} - {valid: {validatedData}, errors: {errors}, isValid: boolean}
 */
export async function validate(data, rules) {
  try {
    const schema = yup.object(rules);
    
    const validatedData = await schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    
    return {
      valid: validatedData,
      errors: {},
      isValid: true
    };
    
  } catch (validationError) {
    const errors = {};
    
    if (validationError.inner) {
      validationError.inner.forEach(error => {
        errors[error.path] = [error.message];
      });
    } else {
      errors.general = [validationError.message];
    }
    
    return {
      valid: {},
      errors,
      isValid: false
    };
  }
}

/**
 * Synchronous validate function for simple cases
 */
export function validateSync(data, rules) {
  try {
    const schema = yup.object(rules);
    
    const validatedData = schema.validateSync(data, {
      abortEarly: false,
      stripUnknown: true
    });
    
    return {
      valid: validatedData,
      errors: {},
      isValid: true
    };
    
  } catch (validationError) {
    const errors = {};
    
    if (validationError.inner) {
      validationError.inner.forEach(error => {
        errors[error.path] = [error.message];
      });
    } else {
      errors.general = [validationError.message];
    }
    
    return {
      valid: {},
      errors,
      isValid: false
    };
  }
}

export default validate;