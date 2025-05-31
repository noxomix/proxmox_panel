import { sign } from 'hono/jwt';
import { createHash } from 'crypto';

export const createJWT = async (userId, type = 'session', expiresIn = '24h') => {
  const tokenId = Bun.randomUUIDv7();
  const now = Math.floor(Date.now() / 1000);
  
  // Calculate expiration
  let exp;
  if (typeof expiresIn === 'string') {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
      exp = now + (value * multipliers[unit]);
    } else {
      exp = now + 86400; // Default 24h
    }
  } else {
    exp = now + expiresIn;
  }

  const payload = {
    user_id: userId,
    token_id: tokenId,
    type,
    iat: now,
    exp
  };

  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-this-in-production-min-32-chars';
  const token = await sign(payload, secret);
  
  return {
    token,
    tokenId,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(exp * 1000)
  };
};

export const hashToken = (token) => {
  return createHash('sha256').update(token).digest('hex');
};