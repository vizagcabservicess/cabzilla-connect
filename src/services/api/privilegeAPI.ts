import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { UserPrivileges, EnhancedUser } from '@/types/privileges';

export const privilegeAPI = {
  /**
   * Get privileges for a specific user
   */
  getUserPrivileges: async (userId: number): Promise<UserPrivileges | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/user-privileges.php?user_id=${userId}`);
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Error fetching user privileges:', error);
      throw error;
    }
  },

  /**
   * Get all admin users with their privileges
   */
  getAllUserPrivileges: async (): Promise<EnhancedUser[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/user-privileges.php`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching all user privileges:', error);
      throw error;
    }
  },

  /**
   * Update user privileges
   */
  updateUserPrivileges: async (
    userId: number, 
    modulePrivileges: string[], 
    customPermissions?: any
  ): Promise<boolean> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/user-privileges.php`,
        {
          userId,
          modulePrivileges,
          customPermissions: customPermissions || {}
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.success;
    } catch (error) {
      console.error('Error updating user privileges:', error);
      throw error;
    }
  },

  /**
   * Remove user privileges
   */
  removeUserPrivileges: async (userId: number): Promise<boolean> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/user-privileges.php?user_id=${userId}`
      );
      return response.data.success;
    } catch (error) {
      console.error('Error removing user privileges:', error);
      throw error;
    }
  },

  /**
   * Check if user has specific privilege
   */
  checkUserPrivilege: async (userId: number, privilegeId: string): Promise<boolean> => {
    try {
      const privileges = await this.getUserPrivileges(userId);
      if (!privileges) return false;
      
      // Super admin has all privileges
      if (privileges.role === 'super_admin') return true;
      
      return privileges.modulePrivileges.includes(privilegeId);
    } catch (error) {
      console.error('Error checking user privilege:', error);
      return false;
    }
  }
};

export default privilegeAPI;