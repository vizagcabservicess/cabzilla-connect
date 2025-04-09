
// Only import the authAPI that exists
import { authAPI } from './authAPI';

// Re-export authAPI
export { authAPI };

// Export a default object with all available APIs
export default {
  auth: authAPI
};
