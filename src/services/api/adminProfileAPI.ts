import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { 
  AdminProfile, 
  CreateAdminProfileRequest, 
  UpdateAdminProfileRequest, 
  OperatorCard 
} from '@/types/adminProfile';

// Helper to get token from localStorage
function getAuthToken() {
  return localStorage.getItem('auth_token');
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
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching admin profiles:', error);
      throw error;
    }
  },

  /**
   * Get specific admin profile
   */
  getAdminProfile: async (adminId: number): Promise<AdminProfile | null> => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?admin_id=${adminId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/admin-profiles.php`,
        profileData,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
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
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/admin-profiles.php`,
        profileData,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
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
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/admin-profiles.php?id=${profileId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?admin_id=me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Error fetching my profile:', error);
      throw error;
    }
  }
};

export default adminProfileAPI;