
export const commissionAPI = {
  calculateCommission: async (bookingId: string) => {
    // Mock implementation
    return Promise.resolve({
      commission_percentage: 10,
      commission_amount: 100
    });
  },
  
  createCommissionPayment: async (data: any) => {
    // Mock implementation
    return Promise.resolve({ success: true });
  },
  
  getCommissionPayments: async () => {
    // Mock implementation
    return Promise.resolve([]);
  },
  
  updateCommissionPayment: async (id: string, data: any) => {
    // Mock implementation
    return Promise.resolve({ success: true });
  },
  
  getCommissionSettings: async () => {
    // Mock implementation
    return Promise.resolve([]);
  },
  
  updateCommissionSetting: async (id: string, data: any) => {
    // Mock implementation
    return Promise.resolve({ success: true });
  },
  
  createCommissionSetting: async (data: any) => {
    // Mock implementation
    return Promise.resolve({ success: true });
  },
  
  getDefaultCommission: async (vehicleType: string) => {
    // Mock implementation
    return Promise.resolve({ percentage: 10 });
  }
};
