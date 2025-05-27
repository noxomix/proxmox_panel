import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export const jwtUtils = {
  // Generate JWT token for user
  generateToken(user, type = 'session') {
    const expiresIn = type === 'api' ? '365d' : '24h';
    
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        type,
        jti: Date.now().toString() // JWT ID for tracking
      },
      JWT_SECRET,
      { expiresIn }
    );
  },

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
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