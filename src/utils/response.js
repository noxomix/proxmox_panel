export const apiResponse = {
  success: (data = null, message = 'Success', meta = {}) => ({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  }),

  error: (message = 'An error occurred', errors = null, statusCode = 500, meta = {}) => ({
    success: false,
    message,
    errors,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      statusCode,
      ...meta
    }
  }),

  validation: (errors, message = 'Validation failed') => ({
    success: false,
    message,
    errors,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      statusCode: 422
    }
  }),

  unauthorized: (message = 'Unauthorized') => ({
    success: false,
    message,
    errors: null,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      statusCode: 401
    }
  }),

  forbidden: (message = 'Forbidden') => ({
    success: false,
    message,
    errors: null,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      statusCode: 403
    }
  }),

  notFound: (message = 'Resource not found') => ({
    success: false,
    message,
    errors: null,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      statusCode: 404
    }
  })
};