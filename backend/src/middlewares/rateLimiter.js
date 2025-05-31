import { HTTPException } from 'hono/http-exception';

// Simple in-memory rate limiter
const requests = new Map();

export const rateLimiter = (windowMs = null, maxRequests = null) => {
  const windowTime = windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
  const maxReqs = maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               c.env?.remoteAddr || 
               'unknown';
    
    const now = Date.now();
    const windowStart = now - windowTime;

    // Clean up old entries
    for (const [key, data] of requests.entries()) {
      if (data.windowStart < windowStart) {
        requests.delete(key);
      }
    }

    // Get or create request data for this IP
    let requestData = requests.get(ip);
    if (!requestData || requestData.windowStart < windowStart) {
      requestData = {
        count: 0,
        windowStart: now
      };
      requests.set(ip, requestData);
    }

    // Check if limit exceeded
    if (requestData.count >= maxReqs) {
      throw new HTTPException(429, { 
        message: 'Too many requests',
        cause: {
          limit: maxReqs,
          window: windowTime,
          reset: requestData.windowStart + windowTime
        }
      });
    }

    // Increment count
    requestData.count++;

    // Add rate limit headers
    c.header('X-RateLimit-Limit', maxReqs.toString());
    c.header('X-RateLimit-Remaining', (maxReqs - requestData.count).toString());
    c.header('X-RateLimit-Reset', new Date(requestData.windowStart + windowTime).toISOString());

    await next();
  };
};