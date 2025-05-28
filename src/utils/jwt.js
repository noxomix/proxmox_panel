import jwt from 'jsonwebtoken';
import { security } from './security.js';

// Validate JWT secret exists and is secure
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-this-in-production') {
  console.error('🔴 SECURITY WARNING: JWT_SECRET environment variable not set or using default value!');
  console.error('🔴 Please set a secure JWT_SECRET in your environment variables');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}

// In production, no fallback is allowed
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production environment');
}

const SECRET = JWT_SECRET || 'dev-only-fallback-secret-not-for-production';

export const jwtUtils = {
  // Generate JWT token for user
  generateToken(user, type = 'session') {
    const expiresIn = type === 'api' ? '365d' : '24h';
    
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        type,
        jti: security.generateSecureJti() // Cryptographically secure JWT ID
      },
      SECRET,
      { expiresIn }
    );
  },

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  // Decode JWT without verification (for debugging)
  decodeToken(token) {
    return jwt.decode(token);
  },

  // Get token expiration as Date object
  getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    return new Date(decoded.exp * 1000);
  }
};

export default jwtUtils;