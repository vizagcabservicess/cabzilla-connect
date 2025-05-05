
import axios from 'axios';
import { API_BASE_URL } from '@/config';

export const apiHealthCheck = {
  /**
   * Check API connectivity
   */
  checkConnection: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/status.php`, {
        timeout: 5000
      });
      return {
        success: true,
        status: response.status,
        data: response.data
      };
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
   * Log diagnostic information
   */
  logDiagnostics: () => {
    console.log('API Base URL:', API_BASE_URL);
    console.log('Current environment:', process.env.NODE_ENV || 'development');
    console.log('User agent:', navigator.userAgent);
    
    // Check for service worker interference
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('Service worker registrations:', registrations.length);
      });
    }
  }
};
