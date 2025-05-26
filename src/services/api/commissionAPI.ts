
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
  }
};
