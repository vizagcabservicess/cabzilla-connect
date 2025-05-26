
export const authAPI = {
  login: async (email: string, password: string) => {
    // Mock implementation for now
    return Promise.resolve({ user: { id: 1, name: 'User', email }, token: 'mock-token' });
  },
  
  signup: async (name: string, email: string, password: string, phone?: string) => {
    // Mock implementation for now
    return Promise.resolve({ user: { id: 1, name, email, phone }, token: 'mock-token' });
  }
};
