import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { 
  AdminProfile, 
  CreateAdminProfileRequest, 
  UpdateAdminProfileRequest, 
  OperatorCard 
} from '@/types/adminProfile';
import { authAPI } from '@/services/api/authAPI';

// Helper to get token from authAPI
function getAuthToken() {
  const token = authAPI.getToken();
  const localToken = localStorage.getItem('auth_token');
  console.log('[adminProfileAPI] Token from authAPI:', token ? token.substring(0, 20) + '...' : 'null');
  console.log('[adminProfileAPI] Token from localStorage:', localToken ? localToken.substring(0, 20) + '...' : 'null');
  
  // Try localStorage first if authAPI token is null
  const finalToken = token || localToken;
  console.log('[adminProfileAPI] Using final token:', finalToken ? finalToken.substring(0, 20) + '...' : 'null');
  
  return finalToken;
}

export const adminProfileAPI = {
  /**
   * Get all operator profiles for public display
   */
  getPublicOperators: async (): Promise<OperatorCard[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?public=1`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching public operators:', error);
      throw error;
    }
  },

  /**
   * Get all admin profiles (super admin only)
   */
  getAllAdminProfiles: async (): Promise<AdminProfile[]> => {
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('[adminProfileAPI] Request headers (getAllAdminProfiles):', headers);
      console.log('[adminProfileAPI] Making request to:', `${API_BASE_URL}/api/admin/admin-profiles.php`);
      
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php`, {
        headers,
      });
      console.log('[adminProfileAPI] Response received:', response.data);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching admin profiles:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      }
      throw error;
    }
  },

  /**
   * Get my admin profile (admin only)
   */
  getMyAdminProfile: async (): Promise<AdminProfile | null> => {
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('[adminProfileAPI] Request headers (getMyAdminProfile):', headers);
      
      
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?my=1`, {
        headers,
      });
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Error fetching my admin profile:', error);
      throw error;
    }
  },

  /**
   * Get specific admin profile
   */
  getAdminProfile: async (adminId: number): Promise<AdminProfile | null> => {
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('[adminProfileAPI] Request headers (getAdminProfile):', headers);
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?admin_id=${adminId}`, {
        headers,
      });
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      throw error;
    }
  },

  /**
   * Create new admin profile
   */
  createAdminProfile: async (profileData: CreateAdminProfileRequest): Promise<{ id: number }> => {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      console.log('[adminProfileAPI] Request headers (createAdminProfile):', headers);
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/admin-profiles.php`,
        profileData,
        {
          headers,
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create admin profile');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error creating admin profile:', error);
      throw error;
    }
  },

  /**
   * Update admin profile
   */
  updateAdminProfile: async (profileData: UpdateAdminProfileRequest): Promise<void> => {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      console.log('[adminProfileAPI] Request headers (updateAdminProfile):', headers);
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/admin-profiles.php`,
        profileData,
        {
          headers,
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update admin profile');
      }
    } catch (error) {
      console.error('Error updating admin profile:', error);
      throw error;
    }
  },

  /**
   * Delete admin profile (super admin only)
   */
  deleteAdminProfile: async (profileId: number): Promise<void> => {
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('[adminProfileAPI] Request headers (deleteAdminProfile):', headers);
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/admin-profiles.php?id=${profileId}`,
        {
          headers,
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete admin profile');
      }
    } catch (error) {
      console.error('Error deleting admin profile:', error);
      throw error;
    }
  },

  /**
   * Get current user's admin profile
   */
  getMyProfile: async (): Promise<AdminProfile | null> => {
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('[adminProfileAPI] Request headers (getMyProfile):', headers);
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?admin_id=me`, {
        headers,
      });
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Error fetching my profile:', error);
      throw error;
    }
  }
};

export default adminProfileAPI;