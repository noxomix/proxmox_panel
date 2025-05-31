import { HTTPException } from 'hono/http-exception';

export const errorHandler = async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Error caught by error handler:', error);

    // Handle HTTP exceptions
    if (error instanceof HTTPException) {
      return c.json({
        success: false,
        data: null,
        message: error.message,
        errors: error.cause || null
      }, error.status);
    }

    // Handle validation errors (Yup)
    if (error.name === 'ValidationError') {
      return c.json({
        success: false,
        data: null,
        message: 'Validation failed',
        errors: error.errors
      }, 400);
    }

    // Handle database errors
    if (error.code && error.code.startsWith('ER_')) {
      let message = 'Database error';
      let status = 500;

      switch (error.code) {
        case 'ER_DUP_ENTRY':
          message = 'Duplicate entry found';
          status = 409;
          break;
        case 'ER_NO_REFERENCED_ROW_2':
          message = 'Referenced record not found';
          status = 400;
          break;
        case 'ER_ROW_IS_REFERENCED_2':
          message = 'Cannot delete record with dependencies';
          status = 409;
          break;
      }

      return c.json({
        success: false,
        data: null,
        message,
        errors: process.env.NODE_ENV === 'development' ? error.sqlMessage : null
      }, status);
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return c.json({
        success: false,
        data: null,
        message: 'Invalid token'
      }, 401);
    }

    if (error.name === 'TokenExpiredError') {
      return c.json({
        success: false,
        data: null,
        message: 'Token expired'
      }, 401);
    }

    // Default server error
    return c.json({
      success: false,
      data: null,
      message: 'Internal server error',
      errors: process.env.NODE_ENV === 'development' ? error.message : null
    }, 500);
  }
};