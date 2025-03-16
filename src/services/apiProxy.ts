
/**
 * API Proxy Service
 * 
 * This service creates a client-side proxy for API requests to bypass CORS restrictions
 * and handle API connectivity issues in development and production environments.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Define fallback endpoints - if primary API fails, try these
const API_ENDPOINTS = [
  import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com/api',
  'https://saddlebrown-oryx-227656.hostingersite.com/api',
  '/api' // Relative fallback
];

// Create a proxy instance that will try multiple endpoints
class ApiProxyService {
  private axiosInstances: AxiosInstance[] = [];
  private lastSuccessfulEndpoint: string | null = null;

  constructor() {
    // Initialize axios instances for each endpoint
    API_ENDPOINTS.forEach(endpoint => {
      this.axiosInstances.push(axios.create({
        baseURL: endpoint,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        withCredentials: false,
        timeout: 30000,
      }));
    });

    // Load last successful endpoint from storage
    this.lastSuccessfulEndpoint = localStorage.getItem('last_successful_api_endpoint');
  }

  // Test all endpoints and find the one that works
  async testConnectivity(): Promise<boolean> {
    console.log('Testing API connectivity...');
    
    // Try each endpoint with OPTIONS request (lightweight)
    for (let i = 0; i < this.axiosInstances.length; i++) {
      const instance = this.axiosInstances[i];
      const endpoint = API_ENDPOINTS[i];
      
      try {
        // Test with a simple OPTIONS request
        await instance.options('/login');
        
        // If successful, store this endpoint
        this.lastSuccessfulEndpoint = endpoint;
        localStorage.setItem('last_successful_api_endpoint', endpoint);
        console.log(`✅ API connection successful with endpoint: ${endpoint}`);
        return true;
      } catch (error) {
        console.warn(`❌ API endpoint failed: ${endpoint}`, error);
      }
    }
    
    console.error('❌ All API endpoints failed connection test');
    return false;
  }

  // Make a request trying all endpoints until one works
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    let errors = [];
    
    // If we have a last successful endpoint, try it first
    if (this.lastSuccessfulEndpoint) {
      const index = API_ENDPOINTS.indexOf(this.lastSuccessfulEndpoint);
      if (index !== -1) {
        try {
          const response = await this.axiosInstances[index].request(config);
          return response.data;
        } catch (error) {
          errors.push(error);
          // Continue to try other endpoints
        }
      }
    }
    
    // Try each endpoint
    for (let i = 0; i < this.axiosInstances.length; i++) {
      // Skip the one we already tried
      if (API_ENDPOINTS[i] === this.lastSuccessfulEndpoint) continue;
      
      try {
        const response = await this.axiosInstances[i].request(config);
        
        // Store successful endpoint
        this.lastSuccessfulEndpoint = API_ENDPOINTS[i];
        localStorage.setItem('last_successful_api_endpoint', API_ENDPOINTS[i]);
        
        return response.data;
      } catch (error) {
        errors.push(error);
      }
    }
    
    // All endpoints failed
    console.error('All API endpoints failed', errors);
    throw errors[0]; // Throw the first error
  }
  
  // Helper methods for common operations
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
  
  async options<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'OPTIONS', url });
  }
  
  // Get the current baseURL being used
  getCurrentEndpoint(): string {
    return this.lastSuccessfulEndpoint || API_ENDPOINTS[0];
  }
}

// Create and export a singleton instance
export const apiProxy = new ApiProxyService();
