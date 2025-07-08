import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { 
  AdminProfile, 
  CreateAdminProfileRequest, 
  UpdateAdminProfileRequest, 
  OperatorCard 
} from '@/types/adminProfile';

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
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php`);
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
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?admin_id=${adminId}`);
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
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/admin-profiles.php`,
        profileData,
        {
          headers: {
            'Content-Type': 'application/json',
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
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/admin-profiles.php`,
        profileData,
        {
          headers: {
            'Content-Type': 'application/json',
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
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/admin-profiles.php?id=${profileId}`
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
      // This will get the profile for the currently authenticated user
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?admin_id=me`);
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Error fetching my profile:', error);
      throw error;
    }
  }
};

export default adminProfileAPI;