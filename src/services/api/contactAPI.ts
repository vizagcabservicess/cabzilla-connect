import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://www.vizagtaxihub.com';

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  status: 'success' | 'error';
  message: string;
  messageId?: number;
  emailSent?: boolean;
  data?: {
    name: string;
    email: string;
    subject: string;
    created_at: string;
  };
  errors?: string[];
  debug?: string;
}

export const contactAPI = {
  /**
   * Submit a contact form
   */
  submitContactForm: async (formData: ContactFormData): Promise<ContactResponse> => {
    try {
      console.log('ContactAPI: Submitting form to:', `${API_BASE_URL}/api/contact-form.php`);
      console.log('ContactAPI: Form data:', formData);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/contact-form.php`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );
      
      console.log('ContactAPI: Raw response:', response);
      
      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response from server');
      }
      
      // Check if response has the expected structure
      if (typeof response.data !== 'object') {
        throw new Error('Invalid response format from server');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('ContactAPI: Error submitting contact form:', error);
      
      // Handle axios error response
      if (error.response && error.response.data) {
        console.error('ContactAPI: Server error response:', error.response.data);
        return error.response.data;
      }
      
      // Handle network errors
      if (error.code === 'ECONNABORTED') {
        return {
          status: 'error',
          message: 'Request timeout. Please try again.',
        };
      }
      
      if (error.code === 'ERR_NETWORK') {
        return {
          status: 'error',
          message: 'Network error. Please check your connection and try again.',
        };
      }
      
      // Handle other errors
      return {
        status: 'error',
        message: error.message || 'Network error. Please check your connection and try again.',
      };
    }
  },
};



