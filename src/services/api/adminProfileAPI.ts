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
  if (!token) {
    console.warn('[adminProfileAPI] No auth_token found in authAPI! localStorage:', localToken);
  } else {
    console.log('[adminProfileAPI] Using auth_token from authAPI:', token);
  }
  return token;
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
      
      // In development, return mock data if API fails
      if (process.env.NODE_ENV === 'development') {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php`, {
            headers,
          });
          return response.data.success ? response.data.data : [];
        } catch (error) {
          console.warn('[adminProfileAPI] API failed in dev mode, returning mock data:', error);
          // Return mock operator profiles for development
          return [
            {
              id: 1,
              businessName: "Elite Taxi Services",
              displayName: "Elite Taxis",
              businessPhone: "+91 9876543210",
              businessEmail: "elite@example.com",
              businessAddress: "123 Main Street, Vizag",
              description: "Premium taxi services with experienced drivers",
              startingFare: 50,
              serviceAreas: ["Vizag", "Visakhapatnam", "Araku"],
              amenities: ["AC", "GPS", "Music System"],
              vehicleTypes: ["Sedan", "SUV", "Hatchback"],
              isActive: true,
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01"
            },
            {
              id: 2,
              businessName: "Quick Ride Cabs",
              displayName: "Quick Ride",
              businessPhone: "+91 9876543211",
              businessEmail: "quickride@example.com",
              businessAddress: "456 Service Road, Vizag",
              description: "Fast and reliable cab services",
              startingFare: 40,
              serviceAreas: ["Vizag City", "Suburbs"],
              amenities: ["AC", "GPS"],
              vehicleTypes: ["Hatchback", "Sedan"],
              isActive: true,
              createdAt: "2024-01-02",
              updatedAt: "2024-01-02"
            }
          ];
        }
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php`, {
        headers,
      });
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching admin profiles:', error);
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
      
      // In development, return mock data if API fails
      if (process.env.NODE_ENV === 'development') {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/admin/admin-profiles.php?my=1`, {
            headers,
          });
          return response.data.success ? response.data.data : null;
        } catch (error) {
          console.warn('[adminProfileAPI] API failed in dev mode, returning mock profile:', error);
          // Return mock profile for development
          return {
            id: 1,
            businessName: "My Admin Business",
            displayName: "My Business",
            businessPhone: "+91 9876543210",
            businessEmail: "admin@mybusiness.com",
            businessAddress: "Admin Office, Vizag",
            description: "My admin business profile",
            startingFare: 45,
            serviceAreas: ["Vizag"],
            amenities: ["AC", "GPS"],
            vehicleTypes: ["Sedan"],
            isActive: true,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01"
          };
        }
      }
      
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