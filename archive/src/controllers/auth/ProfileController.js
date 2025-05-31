const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('../../db');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

class ProfileController {
  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json(
          createErrorResponse('Current password and new password are required')
        );
      }

      if (newPassword.length < 6) {
        return res.status(400).json(
          createErrorResponse('New password must be at least 6 characters long')
        );
      }

      // Get user from database
      const user = await knex('users').where('id', userId).first();
      if (!user) {
        return res.status(404).json(createErrorResponse('User not found'));
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json(createErrorResponse('Current password is incorrect'));
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await knex('users')
        .where('id', userId)
        .update({
          password: hashedNewPassword,
          updated_at: knex.fn.now()
        });

      res.json(createSuccessResponse(
        { message: 'Password changed successfully' },
        'Password changed successfully'
      ));
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  }

  // Generate API token
  async generateApiToken(req, res) {
    try {
      const userId = req.user.id;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 365 days

      // Create API token payload
      const tokenPayload = {
        id: userId,
        type: 'api',
        iat: Math.floor(now.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000)
      };

      // Generate token
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'your-secret-key');

      // Store token in database
      await knex('tokens').insert({
        user_id: userId,
        token: token,
        type: 'api',
        expires_at: expiresAt,
        created_at: now,
        updated_at: now
      });

      res.json(createSuccessResponse({
        token: token,
        expires_at: expiresAt.toISOString(),
        type: 'api'
      }, 'API token generated successfully'));
    } catch (error) {
      console.error('Generate API token error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  }

  // Get current API token
  async getCurrentApiToken(req, res) {
    try {
      const userId = req.user.id;

      // Get latest API token for user
      const token = await knex('tokens')
        .where('user_id', userId)
        .where('type', 'api')
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .first();

      if (!token) {
        return res.json(createSuccessResponse(null, 'No active API token found'));
      }

      res.json(createSuccessResponse({
        token: token.token,
        expires_at: token.expires_at,
        type: token.type,
        created_at: token.created_at
      }));
    } catch (error) {
      console.error('Get API token error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  }

  // Get active sessions
  async getSessions(req, res) {
    try {
      const userId = req.user.id;

      // Get all active sessions for user
      const sessions = await knex('tokens')
        .where('user_id', userId)
        .where('type', 'session')
        .where('expires_at', '>', new Date())
        .orderBy('updated_at', 'desc')
        .select('id', 'created_at', 'updated_at', 'expires_at', 'ip_address', 'user_agent');

      // Mark current session
      const currentTokenId = req.tokenId;
      const sessionsWithCurrent = sessions.map(session => ({
        ...session,
        is_current: session.id === currentTokenId
      }));

      res.json(createSuccessResponse(sessionsWithCurrent));
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  }

  // Revoke session
  async revokeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      // Check if session belongs to user
      const session = await knex('tokens')
        .where('id', sessionId)
        .where('user_id', userId)
        .where('type', 'session')
        .first();

      if (!session) {
        return res.status(404).json(createErrorResponse('Session not found'));
      }

      // Don't allow revoking current session
      if (session.id === req.tokenId) {
        return res.status(400).json(createErrorResponse('Cannot revoke current session'));
      }

      // Delete session
      await knex('tokens').where('id', sessionId).del();

      res.json(createSuccessResponse(
        { message: 'Session revoked successfully' },
        'Session revoked successfully'
      ));
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  }
}

module.exports = new ProfileController();