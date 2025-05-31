/**
 * Frontend Proxy Middleware
 * 
 * Proxies non-API routes to the Vue dev server during development.
 * This allows the backend to serve both API routes and frontend assets
 * seamlessly without CORS issues.
 */

export const frontendProxyMiddleware = async (c, next) => {
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  
  // Skip proxy for API routes (including static files)
  if (pathname.startsWith('/api/')) {
    return next();
  }
  
  // Skip proxy for health check
  if (pathname === '/health') {
    return next();
  }
  
  // Only proxy in development mode
  if (process.env.NODE_ENV === 'production') {
    // In production, return 404 for non-API routes
    return c.json({
      success: false,
      data: null,
      message: 'Route not found'
    }, 404);
  }
  
  // Proxy all other routes to frontend in development
  
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const targetUrl = `${frontendUrl}${pathname}${url.search}`;
    
    console.log(`🔄 Proxying ${pathname} to ${targetUrl}`);
    
    // Forward the request to the Vue dev server
    const headers = Object.fromEntries(c.req.raw.headers);
    
    // Remove problematic headers and set proper host
    delete headers.host;
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-proto'];
    
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: {
        ...headers,
        // Set proper host for Vite
        'host': 'localhost:3001',
        // Ensure proper forwarding headers
        'x-forwarded-for': c.req.header('x-forwarded-for') || 'unknown',
        'x-forwarded-proto': url.protocol.slice(0, -1),
        'x-forwarded-host': c.req.header('host') || 'localhost:3000'
      },
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined
    });
    
    // Copy response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      // Skip problematic headers
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    
    // Return the proxied response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('❌ Frontend proxy error:', error);
    
    // Fallback to 404 if proxy fails
    return c.json({
      success: false,
      data: null,
      message: 'Frontend not available'
    }, 503);
  }
};