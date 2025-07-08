import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { User } from '@/types/api';

// Define a userAPI object with methods for user-related API operations
export const userAPI = {
  /**
   * Get all users
   */
  getAllUsers: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/users.php`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  },
  
  /**
   * Create a new user
   */
  createUser: async (userData: Partial<User>) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/admin/users.php`, userData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  /**
   * Update user details (role only)
   */
  updateUser: async (userId: number | string, userData: Partial<User>) => {
    try {
      // Only role update is supported
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/users.php`,
        { userId, role: userData.role },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
  
  /**
   * Delete user
   */
  deleteUser: async (userId: number | string) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/users.php`,
        {
          data: { user_id: userId },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
  
  /**
   * Update user role
   */
  updateUserRole: async (userId: number | string, role: string) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/users.php`,
        { userId, role },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }
};

export default userAPI;
