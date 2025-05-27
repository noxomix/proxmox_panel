/**
 * Rate limiting middleware for authentication endpoints
 * Prevents brute force attacks while maintaining performance
 * Includes global rate limiting to prevent distributed botnet attacks
 */

// Rate limiting configuration from environment variables
const RATE_LIMIT_CONFIG = {
  // IP-based rate limiting
  IP_MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_IP_MAX_ATTEMPTS || '5'),
  IP_WINDOW_MS: parseInt(process.env.RATE_LIMIT_IP_WINDOW_MS || '900000'), // 15 minutes default
  
  // Global rate limiting (system-wide)
  GLOBAL_MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX_ATTEMPTS || '100'),
  GLOBAL_WINDOW_MS: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || '3600000'), // 1 hour default
  
  // Per-user rate limiting
  USER_MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_USER_MAX_ATTEMPTS || '10'),
  USER_WINDOW_MS: parseInt(process.env.RATE_LIMIT_USER_WINDOW_MS || '1800000'), // 30 minutes default
  
  // Cleanup interval
  CLEANUP_INTERVAL_MS: parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS || '300000'), // 5 minutes default
  
  // Progressive delay settings
  ENABLE_PROGRESSIVE_DELAY: process.env.RATE_LIMIT_ENABLE_PROGRESSIVE_DELAY !== 'false',
  MAX_DELAY_MULTIPLIER: parseInt(process.env.RATE_LIMIT_MAX_DELAY_MULTIPLIER || '10')
};

// Log configuration on startup
console.log('🔒 Rate Limiting Configuration:');
console.log(`   IP Limit: ${RATE_LIMIT_CONFIG.IP_MAX_ATTEMPTS} attempts per ${Math.floor(RATE_LIMIT_CONFIG.IP_WINDOW_MS / 60000)} minutes`);
console.log(`   Global Limit: ${RATE_LIMIT_CONFIG.GLOBAL_MAX_ATTEMPTS} attempts per ${Math.floor(RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS / 60000)} minutes`);
console.log(`   User Limit: ${RATE_LIMIT_CONFIG.USER_MAX_ATTEMPTS} attempts per ${Math.floor(RATE_LIMIT_CONFIG.USER_WINDOW_MS / 60000)} minutes`);

const attemptStore = new Map(); // In production, use Redis
const globalStore = new Map(); // Global rate limiting store
const userAttemptStore = new Map(); // Per-user attempt tracking

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  
  // Cleanup IP-based attempts
  for (const [key, data] of attemptStore.entries()) {
    if (now - data.firstAttempt > RATE_LIMIT_CONFIG.IP_WINDOW_MS) {
      attemptStore.delete(key);
    }
  }
  
  // Cleanup global attempts
  for (const [key, data] of globalStore.entries()) {
    if (now - data.firstAttempt > RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS) {
      globalStore.delete(key);
    }
  }
  
  // Cleanup user-specific attempts
  for (const [key, data] of userAttemptStore.entries()) {
    if (now - data.firstAttempt > RATE_LIMIT_CONFIG.USER_WINDOW_MS) {
      userAttemptStore.delete(key);
    }
  }
}, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL_MS);

/**
 * Global rate limiter to prevent distributed botnet attacks
 */
export const createGlobalRateLimiter = (config = {}) => {
  const {
    maxGlobalAttempts = RATE_LIMIT_CONFIG.GLOBAL_MAX_ATTEMPTS,
    globalWindowMs = RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS,
    maxUserAttempts = RATE_LIMIT_CONFIG.USER_MAX_ATTEMPTS,
    userWindowMs = RATE_LIMIT_CONFIG.USER_WINDOW_MS
  } = config;

  return async (c, next, requestData = {}) => {
    const now = Date.now();
    const { targetUser } = requestData; // Username being targeted (for login attempts)

    // 1. Check global rate limit (all failed login attempts system-wide)
    let globalData = globalStore.get('global_failed_logins');
    if (!globalData || now - globalData.firstAttempt > globalWindowMs) {
      globalData = { count: 0, firstAttempt: now, lastAttempt: now };
    }

    if (globalData.count >= maxGlobalAttempts) {
      console.warn(`🚨 GLOBAL RATE LIMIT EXCEEDED: ${globalData.count} failed attempts in last hour`);
      
      // Adaptive delay based on attack intensity
      const attackIntensity = Math.min(Math.floor(globalData.count / maxGlobalAttempts), 10);
      const delay = attackIntensity * 1000; // 1-10 seconds delay
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return c.json({
        success: false,
        message: 'System temporarily unavailable due to high load. Please try again later.',
        retry_after: Math.ceil((globalData.firstAttempt + globalWindowMs - now) / 1000)
      }, 503); // Service Unavailable
    }

    // 2. Check per-user rate limit (prevent username enumeration via botnets)
    if (targetUser) {
      let userData = userAttemptStore.get(targetUser);
      if (!userData || now - userData.firstAttempt > userWindowMs) {
        userData = { count: 0, firstAttempt: now, lastAttempt: now };
      }

      if (userData.count >= maxUserAttempts) {
        console.warn(`🚨 USER RATE LIMIT EXCEEDED: ${userData.count} attempts on user "${targetUser}"`);
        
        // Temporary account protection without revealing if user exists
        const timeLeft = Math.ceil((userData.firstAttempt + userWindowMs - now) / 1000);
        return c.json({
          success: false,
          message: 'Too many attempts. Please try again later.',
          retry_after: timeLeft
        }, 429);
      }
    }

    // Execute the route
    await next();

    // Track failed attempts for global and user-specific rate limiting
    if (c.res.status >= 400) {
      // Update global counter
      globalData.count++;
      globalData.lastAttempt = now;
      globalStore.set('global_failed_logins', globalData);

      // Update user-specific counter if targeting a specific user
      if (targetUser) {
        let userData = userAttemptStore.get(targetUser);
        if (!userData || now - userData.firstAttempt > userWindowMs) {
          userData = { count: 0, firstAttempt: now, lastAttempt: now };
        }
        userData.count++;
        userData.lastAttempt = now;
        userAttemptStore.set(targetUser, userData);
      }
    }
    
    return;
  };
};

export const createRateLimiter = (config = {}) => {
  const {
    maxAttempts = RATE_LIMIT_CONFIG.IP_MAX_ATTEMPTS,
    windowMs = RATE_LIMIT_CONFIG.IP_WINDOW_MS,
    skipSuccessfulRequests = true,
    keyGenerator = (c) => {
      // Use combination of IP and User-Agent for better fingerprinting
      const ip = c.req.header('x-forwarded-for') || 
                c.req.header('x-real-ip') || 
                c.req.header('cf-connecting-ip') || 
                'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';
      return `${ip}:${userAgent.substring(0, 50)}`; // Limit UA length
    }
  } = config;

  return async (c, next) => {
    const key = keyGenerator(c);
    const now = Date.now();
    
    // Get current attempt data
    let attemptData = attemptStore.get(key);
    
    if (!attemptData) {
      attemptData = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now
      };
    }

    // Reset window if expired
    if (now - attemptData.firstAttempt > windowMs) {
      attemptData = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now
      };
    }

    // Check if limit exceeded
    if (attemptData.count >= maxAttempts) {
      const timeLeft = Math.ceil((attemptData.firstAttempt + windowMs - now) / 1000);
      
      // Progressive delay for repeated offenders
      let additionalDelay = 0;
      if (RATE_LIMIT_CONFIG.ENABLE_PROGRESSIVE_DELAY) {
        const delayMultiplier = Math.min(Math.floor(attemptData.count / maxAttempts), RATE_LIMIT_CONFIG.MAX_DELAY_MULTIPLIER);
        additionalDelay = delayMultiplier * 60; // Additional minutes
      }
      
      return c.json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retry_after: timeLeft + additionalDelay
      }, 429, {
        'Retry-After': (timeLeft + additionalDelay).toString(),
        'X-RateLimit-Limit': maxAttempts.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(attemptData.firstAttempt + windowMs + (additionalDelay * 1000)).toISOString()
      });
    }

    // Execute the route
    await next();

    // Only count failed attempts (non-2xx responses)
    if (!skipSuccessfulRequests || c.res.status >= 400) {
      attemptData.count++;
      attemptData.lastAttempt = now;
      attemptStore.set(key, attemptData);
    }
    
    return;
  };
};

// Global rate limiter instance for botnet protection
export const globalRateLimit = createGlobalRateLimiter();

// Combined rate limiter for login that includes both IP and global limits
export const loginRateLimit = async (c, next) => {
  // Extract username from request body for user-specific rate limiting
  let targetUser = null;
  let requestBody = null;
  
  try {
    requestBody = await c.req.json();
    targetUser = requestBody?.identity;
  } catch (e) {
    // If we can't parse body, continue without user-specific limiting
  }
  
  // Reset the request body for the actual handler
  if (requestBody) {
    c.req.json = () => Promise.resolve(requestBody);
  }
  
  const now = Date.now();
  const ip = c.req.header('x-forwarded-for') || 
            c.req.header('x-real-ip') || 
            c.req.header('cf-connecting-ip') || 
            'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  const key = `${ip}:${userAgent.substring(0, 50)}`;
  
  // 1. Check IP-based rate limit
  let attemptData = attemptStore.get(key);
  const windowMs = RATE_LIMIT_CONFIG.IP_WINDOW_MS;
  const maxAttempts = RATE_LIMIT_CONFIG.IP_MAX_ATTEMPTS;
  
  if (!attemptData || now - attemptData.firstAttempt > windowMs) {
    attemptData = { count: 0, firstAttempt: now, lastAttempt: now };
  }
  
  if (attemptData.count >= maxAttempts) {
    const timeLeft = Math.ceil((attemptData.firstAttempt + windowMs - now) / 1000);
    
    let additionalDelay = 0;
    if (RATE_LIMIT_CONFIG.ENABLE_PROGRESSIVE_DELAY) {
      const delayMultiplier = Math.min(Math.floor(attemptData.count / maxAttempts), RATE_LIMIT_CONFIG.MAX_DELAY_MULTIPLIER);
      additionalDelay = delayMultiplier * 60;
    }
    
    return c.json({
      success: false,
      message: 'Too many attempts. Please try again later.',
      retry_after: timeLeft + additionalDelay
    }, 429, {
      'Retry-After': (timeLeft + additionalDelay).toString(),
      'X-RateLimit-Limit': maxAttempts.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(attemptData.firstAttempt + windowMs + (additionalDelay * 1000)).toISOString()
    });
  }
  
  // 2. Check global rate limit
  let globalData = globalStore.get('global_failed_logins');
  const globalWindowMs = RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS;
  const maxGlobalAttempts = RATE_LIMIT_CONFIG.GLOBAL_MAX_ATTEMPTS;
  
  if (!globalData || now - globalData.firstAttempt > globalWindowMs) {
    globalData = { count: 0, firstAttempt: now, lastAttempt: now };
  }
  
  if (globalData.count >= maxGlobalAttempts) {
    console.warn(`🚨 GLOBAL RATE LIMIT EXCEEDED: ${globalData.count} failed attempts in last ${Math.floor(globalWindowMs / 60000)} minutes`);
    
    const attackIntensity = Math.min(Math.floor(globalData.count / maxGlobalAttempts), RATE_LIMIT_CONFIG.MAX_DELAY_MULTIPLIER);
    const delay = attackIntensity * 1000;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return c.json({
      success: false,
      message: 'System temporarily unavailable due to high load. Please try again later.',
      retry_after: Math.ceil((globalData.firstAttempt + globalWindowMs - now) / 1000)
    }, 503);
  }
  
  // 3. Check per-user rate limit
  if (targetUser) {
    let userData = userAttemptStore.get(targetUser);
    const userWindowMs = RATE_LIMIT_CONFIG.USER_WINDOW_MS;
    const maxUserAttempts = RATE_LIMIT_CONFIG.USER_MAX_ATTEMPTS;
    
    if (!userData || now - userData.firstAttempt > userWindowMs) {
      userData = { count: 0, firstAttempt: now, lastAttempt: now };
    }
    
    if (userData.count >= maxUserAttempts) {
      console.warn(`🚨 USER RATE LIMIT EXCEEDED: ${userData.count} attempts on user "${targetUser}"`);
      
      const timeLeft = Math.ceil((userData.firstAttempt + userWindowMs - now) / 1000);
      return c.json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retry_after: timeLeft
      }, 429);
    }
  }
  
  // Execute the actual login route
  await next();
  
  // Track failed attempts after the route has executed
  if (c.res.status >= 400) {
    // Update IP counter
    attemptData.count++;
    attemptData.lastAttempt = now;
    attemptStore.set(key, attemptData);
    
    // Update global counter
    globalData.count++;
    globalData.lastAttempt = now;
    globalStore.set('global_failed_logins', globalData);
    
    // Update user-specific counter
    if (targetUser) {
      let userData = userAttemptStore.get(targetUser);
      const userWindowMs = RATE_LIMIT_CONFIG.USER_WINDOW_MS;
      if (!userData || now - userData.firstAttempt > userWindowMs) {
        userData = { count: 0, firstAttempt: now, lastAttempt: now };
      }
      userData.count++;
      userData.lastAttempt = now;
      userAttemptStore.set(targetUser, userData);
    }
  }
};

// General rate limiter for API endpoints (2 requests per second)
export const generalRateLimit = createRateLimiter({
  maxAttempts: 2,
  windowMs: 1000, // 1 second
  skipSuccessfulRequests: true // Don't count successful requests
});

// Aggressive rate limiter for repeated offenders
export const strictRateLimit = createRateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  skipSuccessfulRequests: false
});