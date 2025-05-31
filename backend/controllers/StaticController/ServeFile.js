import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

export const serveStaticFile = async (c) => {
  try {
    const filename = c.req.param('filename');
    
    if (!filename) {
      return c.json({
        success: false,
        message: 'Filename is required'
      }, 400);
    }
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return c.json({
        success: false,
        message: 'Invalid filename'
      }, 400);
    }
    
    const filePath = join(process.cwd(), 'public', filename);
    
    // Check if file exists
    try {
      await access(filePath, constants.F_OK);
    } catch {
      return c.json({
        success: false,
        message: 'File not found'
      }, 404);
    }
    
    // Read file
    const fileContent = await readFile(filePath);
    
    // Determine content type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    const contentTypes = {
      'css': 'text/css; charset=utf-8',
      'js': 'application/javascript; charset=utf-8',
      'json': 'application/json; charset=utf-8',
      'html': 'text/html; charset=utf-8',
      'txt': 'text/plain; charset=utf-8',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon'
    };
    
    if (ext && contentTypes[ext]) {
      contentType = contentTypes[ext];
    }
    
    // Set appropriate headers
    const headers = {
      'Content-Type': contentType
    };
    
    // For CSS files, add no-cache headers in development
    if (ext === 'css' && process.env.NODE_ENV !== 'production') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }
    
    return new Response(fileContent, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error serving static file:', error);
    return c.json({
      success: false,
      message: 'Error reading file'
    }, 500);
  }
};