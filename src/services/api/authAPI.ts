
export const authAPI = {
  login: async (email: string, password: string) => {
    // Mock implementation for now
    return Promise.resolve({ 
      user: { id: 1, name: 'User', email, role: 'admin' }, 
      token: 'mock-token' 
    });
  },
  
  signup: async (name: string, email: string, password: string, phone?: string) => {
    // Mock implementation for now
    return Promise.resolve({ 
      user: { id: 1, name, email, phone, role: 'user' }, 
      token: 'mock-token' 
    });
  },
  
  register: async (userData: any) => {
    // Mock implementation for now
    return Promise.resolve({ 
      user: { id: 1, name: userData.name, email: userData.email, role: 'user' }, 
      token: 'mock-token' 
    });
  }
};
