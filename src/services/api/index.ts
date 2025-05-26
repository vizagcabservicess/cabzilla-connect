
// API Services
export const bookingAPI = {
  updateBookingStatus: async (bookingId: string | number, status: string) => {
    // Mock implementation for now
    return Promise.resolve({ success: true });
  },
  createBooking: async (bookingData: any) => {
    // Mock implementation for now
    return Promise.resolve({ booking_number: 'BOOK123', id: 1 });
  }
};

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
