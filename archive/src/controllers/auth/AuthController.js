import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import Token from '../../models/Token.js';
import { apiResponse } from '../../utils/response.js';
import { authMiddleware } from '../../middleware/auth.js';
import { getAuthData } from '../../utils/authHelper.js';
import { jwtUtils } from '../../utils/jwt.js';
import { loginRateLimit } from '../../middleware/rateLimiter.js';
import { security } from '../../utils/security.js';
import { securityMonitoring } from '../../utils/securityMonitoring.js';
import db from '../../db.js';

const auth = new Hono();

// Apply rate limiting to login endpoint
auth.use('/login', loginRateLimit);

// Apply auth middleware to protected routes
auth.use('/token', authMiddleware);
auth.use('/profile', authMiddleware);
auth.use('/password', authMiddleware);

auth.post('/login', async (c) => {
    try {
      const { identity, password } = await c.req.json();

      // Check for suspicious activity
      const suspiciousCheck = security.analyzeSuspiciousActivity(c);
      if (suspiciousCheck.isSuspicious) {
        console.warn(`Suspicious login attempt from ${c.req.header('x-forwarded-for')}: ${suspiciousCheck.reason}`);
        // Still process but log for monitoring
      }

      // Validate and sanitize input
      const validation = security.validateLoginCredentials(identity, password);
      if (!validation.isValid) {
        // Add security delay to prevent timing attacks
        await security.addSecurityDelay();
        return c.json(apiResponse.validation(validation.errors), 422);
      }

      // Use sanitized identity
      const sanitizedIdentity = validation.sanitizedIdentity;
      
      // Validate APPLICATION_SECRET exists
      const pepper = process.env.APPLICATION_SECRET;
      if (!pepper) {
        console.error('🔴 SECURITY WARNING: APPLICATION_SECRET not set!');
        return c.json(apiResponse.error('Server configuration error'), 500);
      }

      // Find user by email or name
      const user = await User.findByIdentity(sanitizedIdentity);
      
      // Always add delay to prevent timing attacks
      await security.addSecurityDelay();
      
      if (!user) {
        // Track failed login attempt for security monitoring
        const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
        const userAgent = c.req.header('user-agent');
        securityMonitoring.trackFailedAttempt(ip, userAgent, sanitizedIdentity);
        
        return c.json(apiResponse.unauthorized('Invalid credentials'), 401);
      }

      // Check if user is active
      if (user.status !== 'active') {
        return c.json(apiResponse.unauthorized('Invalid credentials'), 401); // Don't reveal account status
      }

      // Verify password with constant-time comparison approach
      const isValidPassword = await bcrypt.compare(password + pepper, user.password_hash);
      
      if (!isValidPassword) {
        // Track failed login attempt for security monitoring
        const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
        const userAgent = c.req.header('user-agent');
        securityMonitoring.trackFailedAttempt(ip, userAgent, sanitizedIdentity);
        
        return c.json(apiResponse.unauthorized('Invalid credentials'), 401);
      }

      // Generate JWT token (new system)
      const jwtToken = jwtUtils.generateToken(user, 'session');
      const expiresAt = jwtUtils.getTokenExpiration(jwtToken);

      // Keep session record for management features (hybrid approach)
      await Token.enforceSessionLimit(user.id, 5);
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';
      
      // Create session record with JWT tracking
      const { v7: uuidv7 } = await import('uuid');
      const tokenData = {
        id: uuidv7(),
        user_id: user.id,
        type: 'session',
        jwt_id: jwtUtils.decodeToken(jwtToken).jti,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent
      };
      
      await db('tokens').insert({
        ...tokenData,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Return success response with JWT
      return c.json(
        apiResponse.success({
          token: jwtToken, // Return JWT instead of DB token
          user: user.toJSON(),
          expires_at: expiresAt
        }, 'Login successful'), 
        200
      );

    } catch (error) {
      console.error('Login error:', error);
      return c.json(
        apiResponse.error('Login failed', null, 500), 
        500
      );
    }
});

// Apply auth middleware to all protected routes
auth.use('/logout', authMiddleware);
auth.use('/me', authMiddleware);

auth.post('/logout', async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      const token = authHeader?.substring(7); // Remove 'Bearer ' prefix

      if (token) {
        // Try to decode JWT to get jwt_id
        try {
          const decoded = jwtUtils.decodeToken(token);
          if (decoded && decoded.jti) {
            // Find and delete session record by jwt_id
            await db('tokens').where('jwt_id', decoded.jti).del();
          }
        } catch (jwtError) {
          // If JWT decode fails, try legacy token revocation
          const { token: tokenRecord } = getAuthData(c);
          if (tokenRecord && tokenRecord.revoke) {
            await tokenRecord.revoke();
          }
        }
      }

      return c.json(
        apiResponse.success(null, 'Logout successful'), 
        200
      );

    } catch (error) {
      console.error('Logout error:', error);
      return c.json(
        apiResponse.error('Logout failed', null, 500), 
        500
      );
    }
});

auth.get('/me', async (c) => {
    try {
      const { user, token } = getAuthData(c);

      return c.json(
        apiResponse.success({
          user: user.toJSON(),
          token_expires_at: token.expires_at
        }, 'User profile retrieved'), 
        200
      );

    } catch (error) {
      console.error('Me error:', error);
      return c.json(
        apiResponse.error('Failed to retrieve user profile', null, 500), 
        500
      );
    }
});

// Profile management routes
auth.use('/change-password', authMiddleware);
auth.use('/generate-api-token', authMiddleware);
auth.use('/api-token', authMiddleware);
auth.use('/sessions', authMiddleware);

// Change password
auth.post('/change-password', async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json();
    const { user } = getAuthData(c);

    if (!currentPassword || !newPassword) {
      return c.json(
        apiResponse.error('Current password and new password are required'),
        400
      );
    }

    // Validate new password strength first
    const passwordValidation = security.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return c.json(
        apiResponse.validation({ password: passwordValidation.errors }),
        400
      );
    }

    // Verify current password (with pepper)
    const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword + pepper, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      return c.json(
        apiResponse.error('Current password is incorrect'),
        400
      );
    }

    // Hash new password (with pepper)
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword + pepper, saltRounds);

    // Update password in database
    await User.updatePassword(user.id, hashedNewPassword);

    return c.json(
      apiResponse.success(
        { message: 'Password changed successfully' },
        'Password changed successfully'
      ),
      200
    );
  } catch (error) {
    console.error('Change password error:', error);
    return c.json(
      apiResponse.error('Internal server error'),
      500
    );
  }
});

// Generate API token
auth.post('/generate-api-token', async (c) => {
  try {
    const { user } = getAuthData(c);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 365 days

    // Delete existing API tokens for this user
    await Token.deleteApiTokensByUserId(user.id);

    // Create API token
    const tokenPayload = {
      id: user.id,
      type: 'api',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'your-secret-key');

    // Store token in database
    await Token.createApiToken({
      user_id: user.id,
      token: token,
      type: 'api',
      expires_at: expiresAt,
      ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      user_agent: c.req.header('user-agent') || 'unknown'
    });

    return c.json(
      apiResponse.success({
        token: token,
        expires_at: expiresAt.toISOString(),
        type: 'api'
      }, 'API token generated successfully'),
      200
    );
  } catch (error) {
    console.error('Generate API token error:', error);
    return c.json(
      apiResponse.error('Internal server error'),
      500
    );
  }
});

// Get current API token
auth.get('/api-token', async (c) => {
  try {
    const { user } = getAuthData(c);

    // Get latest API token for user
    const token = await Token.getLatestApiToken(user.id);

    if (!token) {
      return c.json(
        apiResponse.success(null, 'No active API token found'),
        200
      );
    }

    return c.json(
      apiResponse.success({
        token: token.token,
        expires_at: token.expires_at,
        type: token.type,
        created_at: token.created_at
      }),
      200
    );
  } catch (error) {
    console.error('Get API token error:', error);
    return c.json(
      apiResponse.error('Internal server error'),
      500
    );
  }
});

// Get active sessions
auth.get('/sessions', authMiddleware, async (c) => {
  try {
    const { user, token } = getAuthData(c);

    // Get JWT from Authorization header to extract jti
    const authHeader = c.req.header('Authorization');
    const jwtToken = authHeader?.substring(7); // Remove 'Bearer ' prefix
    let currentJwtId = null;
    
    if (jwtToken) {
      try {
        const decoded = jwtUtils.decodeToken(jwtToken);
        currentJwtId = decoded.jti;
      } catch (error) {
        console.error('JWT decode error:', error);
      }
    }

    // Get all active sessions for user
    const sessions = await Token.getActiveSessions(user.id);

    // Mark current session - compare with JWT ID 
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      is_current: session.jwt_id === currentJwtId
    }));

    return c.json(
      apiResponse.success(sessionsWithCurrent),
      200
    );
  } catch (error) {
    console.error('Get sessions error:', error);
    return c.json(
      apiResponse.error('Internal server error'),
      500
    );
  }
});

// Revoke session
auth.delete('/sessions/:sessionId', authMiddleware, async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const { user, token } = getAuthData(c);

    // Check if user exists
    if (!user || !user.id) {
      return c.json(
        apiResponse.error('Authentication required'),
        401
      );
    }

    // Get JWT from Authorization header to extract jti
    const authHeader = c.req.header('Authorization');
    const jwtToken = authHeader?.substring(7); // Remove 'Bearer ' prefix
    let currentJwtId = null;
    
    if (jwtToken) {
      try {
        const decoded = jwtUtils.decodeToken(jwtToken);
        currentJwtId = decoded.jti;
      } catch (error) {
        console.error('JWT decode error in revoke:', error);
      }
    }

    // Check if session belongs to user
    const session = await Token.findById(sessionId);

    if (!session || session.user_id !== user.id || session.type !== 'session') {
      return c.json(
        apiResponse.error('Session not found'),
        404
      );
    }

    // Don't allow revoking current session
    if (session.jwt_id === currentJwtId) {
      return c.json(
        apiResponse.error('Cannot revoke current session'),
        400
      );
    }

    // Delete session
    await Token.deleteById(sessionId);

    return c.json(
      apiResponse.success(
        { message: 'Session revoked successfully' },
        'Session revoked successfully'
      ),
      200
    );
  } catch (error) {
    console.error('Revoke session error:', error);
    return c.json(
      apiResponse.error('Internal server error'),
      500
    );
  }
});

// Revoke all other sessions
auth.delete('/sessions', authMiddleware, async (c) => {
  try {
    const { user, token } = getAuthData(c);

    // Get JWT from Authorization header to extract jti
    const authHeader = c.req.header('Authorization');
    const jwtToken = authHeader?.substring(7); // Remove 'Bearer ' prefix
    let currentJwtId = null;
    
    if (jwtToken) {
      try {
        const decoded = jwtUtils.decodeToken(jwtToken);
        currentJwtId = decoded.jti;
      } catch (error) {
        console.error('JWT decode error in revoke all:', error);
      }
    }

    // Revoke all sessions except current one - use JWT ID
    const deletedCount = await db('tokens')
      .where('user_id', user.id)
      .where('type', 'session')
      .whereNot('jwt_id', currentJwtId)
      .del();

    return c.json(
      apiResponse.success(
        { message: 'All other sessions revoked successfully' },
        'All other sessions revoked successfully'
      ),
      200
    );
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    return c.json(
      apiResponse.error('Internal server error'),
      500
    );
  }
});

/**
 * GET /api/auth/profile - Get current user profile
 */
auth.get('/profile', async (c) => {
  try {
    const { user } = getAuthData(c);
    
    // Get full user data with role information
    const fullUser = await User.findById(user.id);
    if (!fullUser) {
      return c.json(
        apiResponse.error('User not found'),
        404
      );
    }

    // Get user's namespaces and roles - use the namespace-aware method
    const userNamespaces = await fullUser.getNamespaces();
    
    // For profile, we show the role from the root namespace or first available namespace
    let userRole = null;
    if (userNamespaces.length > 0) {
      // Try to find root namespace first, otherwise use first available
      const rootNamespaceAssignment = userNamespaces.find(ns => ns.namespace.name === 'root') || userNamespaces[0];
      userRole = rootNamespaceAssignment?.role;
    }
    
    return c.json(
      apiResponse.success({
        user: {
          ...fullUser.toJSON(),
          role_name: userRole?.name || null,
          role_display_name: userRole?.display_name || null
        }
      }, 'Profile retrieved successfully'),
      200
    );
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json(
      apiResponse.error('Failed to retrieve profile'),
      500
    );
  }
});

export default auth;