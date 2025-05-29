import { currentNamespaceId } from '../stores/namespace.js';

class ApiClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  // Get token from localStorage
  getToken() {
    return localStorage.getItem('auth_token');
  }

  // Set token in localStorage
  setToken(token) {
    localStorage.setItem('auth_token', token);
  }

  // Remove token from localStorage
  removeToken() {
    localStorage.removeItem('auth_token');
  }

  // Build headers with optional auth token and namespace ID
  buildHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Add namespace header if current namespace is set
    if (currentNamespaceId.value) {
      headers['X-Namespace-ID'] = currentNamespaceId.value;
    }

    return headers;
  }

  // Main fetch wrapper with interceptor-like functionality
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      headers: this.buildHeaders(options.headers)
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 - remove token and redirect to login
      if (response.status === 401) {
        this.removeToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      // Parse JSON response
      const data = await response.json();
      
      if (!response.ok) {
        // Create error with response data attached
        const error = new Error(data.message || 'Request failed');
        error.response = { data, status: response.status };
        throw error;
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // HTTP Methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    });
  }

  async post(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : null
    });
  }

  async put(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : null
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }

  async patch(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null
    });
  }

  // Auth specific methods
  async login(identity, password) {
    const response = await this.post('/auth/login', { identity, password });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      this.removeToken();
    }
  }

  async me() {
    return this.get('/auth/me');
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    return this.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
  }

  // Generate API token
  async generateApiToken() {
    return this.post('/auth/generate-api-token');
  }

  // Get current API token
  async getCurrentApiToken() {
    return this.get('/auth/api-token');
  }

  // Get active sessions
  async getSessions() {
    return this.get('/auth/sessions');
  }

  // Revoke session
  async revokeSession(sessionId) {
    return this.delete(`/auth/sessions/${sessionId}`);
  }

  // Revoke all other sessions
  async revokeAllSessions() {
    return this.delete('/auth/sessions');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  }
}

// Create and export singleton instance
export const api = new ApiClient();
export default api;