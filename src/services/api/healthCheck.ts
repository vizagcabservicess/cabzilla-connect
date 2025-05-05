
import axios from 'axios';
import { API_BASE_URL } from '@/config';

export const apiHealthCheck = {
  /**
   * Check API connectivity
   */
  checkConnection: async () => {
    try {
      // First try the relative path without domain
      try {
        const response = await axios.get(`/api/status.php`, {
          timeout: 5000,
          headers: {
            'Cache-Control': 'no-cache',
            'X-Force-Refresh': 'true'
          }
        });
        return {
          success: true,
          status: response.status,
          data: response.data
        };
      } catch (relativeError) {
        console.log('Relative path failed, trying with API_BASE_URL');
        // If relative path fails, try with configured API_BASE_URL
        const response = await axios.get(`${API_BASE_URL}/api/status.php`, {
          timeout: 5000,
          headers: {
            'Cache-Control': 'no-cache',
            'X-Force-Refresh': 'true'
          }
        });
        return {
          success: true,
          status: response.status,
          data: response.data
        };
      }
    } catch (error) {
      console.error('API health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error.response?.status || 0
      };
    }
  },
  
  /**
   * Check database connectivity directly
   */
  checkDatabase: async () => {
    try {
      // Try relative path first
      try {
        const response = await axios.get(`/api/admin/check-connection.php`, {
          timeout: 8000,
          headers: {
            'Cache-Control': 'no-cache',
            'X-Force-Refresh': 'true'
          }
        });
        return {
          success: true,
          status: response.status,
          data: response.data
        };
      } catch (relativeError) {
        // If relative path fails, try with configured API_BASE_URL
        const response = await axios.get(`${API_BASE_URL}/api/admin/check-connection.php`, {
          timeout: 8000,
          headers: {
            'Cache-Control': 'no-cache',
            'X-Force-Refresh': 'true'
          }
        });
        return {
          success: true,
          status: response.status,
          data: response.data
        };
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error.response?.status || 0
      };
    }
  },
  
  /**
   * Log diagnostic information
   */
  logDiagnostics: () => {
    console.log('API Base URL:', API_BASE_URL || 'Not set (using relative paths)');
    console.log('Current environment:', process.env.NODE_ENV || 'development');
    console.log('User agent:', navigator.userAgent);
    console.log('Host:', window.location.host);
    console.log('Origin:', window.location.origin);
    
    // Check for service worker interference
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('Service worker registrations:', registrations.length);
      });
    }
  }
};
