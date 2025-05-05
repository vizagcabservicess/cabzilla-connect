
import { userAPI } from '@/services/api/userAPI';
import { User } from '@/types/api';

/**
 * Function to reload users from API and update localStorage/sessionStorage
 */
export const reloadUsers = async (): Promise<User[]> => {
  try {
    // Clear existing cache
    localStorage.removeItem('users');
    sessionStorage.removeItem('users');
    
    // Fetch fresh user data
    const users = await userAPI.getAllUsers();
    
    // Store in cache for future use
    if (Array.isArray(users)) {
      const usersJSON = JSON.stringify(users);
      localStorage.setItem('users', usersJSON);
      sessionStorage.setItem('users', usersJSON);
    }
    
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('Error reloading users:', error);
    return [];
  }
};

/**
 * Get cached users or fetch them if not available
 */
export const getUsers = async (): Promise<User[]> => {
  // Try to get from session storage first
  const cachedUsers = sessionStorage.getItem('users') || localStorage.getItem('users');
  
  if (cachedUsers) {
    try {
      return JSON.parse(cachedUsers);
    } catch (error) {
      console.error('Error parsing cached users:', error);
      // If there's an error in parsing, fetch fresh data
      return reloadUsers();
    }
  }
  
  // If no cache, fetch fresh
  return reloadUsers();
};

/**
 * Get a single user by ID
 */
export const getUserById = async (id: number | string): Promise<User | null> => {
  const users = await getUsers();
  return users.find(user => user.id === id) || null;
};

/**
 * Get current user data from local storage
 */
export const getCurrentUser = (): User | null => {
  const userData = localStorage.getItem('userData');
  
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch (e) {
    console.error('Error parsing current user data:', e);
    return null;
  }
};
