import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  message?: any;
  errors?: string[];
}

export const contactAPI = {
  /**
   * Submit a contact form
   */
  submitContactForm: async (formData: ContactFormData): Promise<ContactResponse> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/contact-form.php`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      
      // Handle axios error response
      if (error.response && error.response.data) {
        return error.response.data;
      }
      
      // Handle network or other errors
      return {
        status: 'error',
        message: 'Network error. Please check your connection and try again.',
      };
    }
  },
};



