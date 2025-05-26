import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import User from '../../models/User.js';
import Token from '../../models/Token.js';
import { apiResponse } from '../../utils/response.js';

const auth = new Hono();

auth.post('/login', async (c) => {
    try {
      const { identity, password } = await c.req.json();

      // Validation
      if (!identity || !password) {
        return c.json(
          apiResponse.validation({
            identity: !identity ? ['Identity is required'] : undefined,
            password: !password ? ['Password is required'] : undefined
          }), 
          422
        );
      }

      // Find user by email or name
      const user = await User.findByIdentity(identity);
      if (!user) {
        return c.json(
          apiResponse.unauthorized('Invalid credentials'), 
          401
        );
      }

      // Check if user is active
      if (user.status !== 'active') {
        return c.json(
          apiResponse.forbidden('Account is not active'), 
          403
        );
      }

      // Verify password
      const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
      const isValidPassword = await bcrypt.compare(password + pepper, user.password);
      
      if (!isValidPassword) {
        return c.json(
          apiResponse.unauthorized('Invalid credentials'), 
          401
        );
      }

      // Generate token
      const { token, record } = await Token.create(user.id, 'session', 24);

      // Return success response
      return c.json(
        apiResponse.success({
          token,
          user: user.toJSON(),
          expires_at: record.expires_at
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

auth.post('/logout', async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json(
          apiResponse.unauthorized('No token provided'), 
          401
        );
      }

      const token = authHeader.substring(7);
      const tokenRecord = await Token.findByToken(token);

      if (tokenRecord) {
        await tokenRecord.revoke();
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
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json(
          apiResponse.unauthorized('No token provided'), 
          401
        );
      }

      const token = authHeader.substring(7);
      const tokenRecord = await Token.findByToken(token);

      if (!tokenRecord || tokenRecord.isExpired()) {
        return c.json(
          apiResponse.unauthorized('Invalid or expired token'), 
          401
        );
      }

      const user = await User.findById(tokenRecord.user_id);
      if (!user) {
        return c.json(
          apiResponse.unauthorized('User not found'), 
          401
        );
      }

      return c.json(
        apiResponse.success({
          user: user.toJSON(),
          token_expires_at: tokenRecord.expires_at
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

export default auth;