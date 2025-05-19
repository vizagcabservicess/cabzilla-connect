
import axios from 'axios';
import { toast } from 'sonner';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { CommissionSetting, CommissionPayment, CommissionReport } from '@/types/cab';

export const commissionAPI = {
  // Get commission settings
  getCommissionSettings: async () => {
    try {
      const response = await axios.get(getApiUrl('/api/admin/commission-settings.php'), {
        headers: {
          ...forceRefreshHeaders
        }
      });
      
      if (response.data?.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to fetch commission settings');
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error);
      toast.error('Failed to load commission settings');
      return [];
    }
  },

  // Get default commission setting
  getDefaultCommission: async () => {
    try {
      const settings = await commissionAPI.getCommissionSettings();
      const defaultSetting = settings.find((setting: CommissionSetting) => setting.isActive);
      return defaultSetting || { defaultPercentage: 10 };
    } catch (error) {
      console.error('Error fetching default commission setting:', error);
      toast.error('Failed to load default commission setting');
      return { defaultPercentage: 10 };
    }
  },

  // Update commission setting
  updateCommissionSetting: async (id: string, data: Partial<CommissionSetting>) => {
    try {
      const response = await axios.put(getApiUrl('/api/admin/commission-settings.php'), {
        id,
        ...data
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });
      
      if (response.data?.status === 'success') {
        toast.success('Commission setting updated successfully');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to update commission setting');
      }
    } catch (error) {
      console.error('Error updating commission setting:', error);
      toast.error('Failed to update commission setting');
      throw error;
    }
  },

  // Create commission setting
  createCommissionSetting: async (data: Partial<CommissionSetting>) => {
    try {
      const response = await axios.post(getApiUrl('/api/admin/commission-settings.php'), data, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });
      
      if (response.data?.status === 'success') {
        toast.success('Commission setting created successfully');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to create commission setting');
      }
    } catch (error) {
      console.error('Error creating commission setting:', error);
      toast.error('Failed to create commission setting');
      throw error;
    }
  },

  // Calculate commission for a booking
  calculateCommission: async (bookingId: string) => {
    try {
      const response = await axios.post(getApiUrl('/api/admin/vehicle-commissions.php'), {
        action: 'calculate',
        booking_id: bookingId
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });
      
      if (response.data?.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to calculate commission');
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
      toast.error('Failed to calculate commission');
      return null;
    }
  },

  // Get commission payments
  getCommissionPayments: async (params: {
    vehicleId?: string;
    bookingId?: string;
    status?: 'pending' | 'paid' | 'cancelled';
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.vehicleId) queryParams.append('vehicle_id', params.vehicleId);
      if (params.bookingId) queryParams.append('booking_id', params.bookingId);
      if (params.status) queryParams.append('status', params.status);
      if (params.startDate) queryParams.append('start_date', params.startDate);
      if (params.endDate) queryParams.append('end_date', params.endDate);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await axios.get(`${getApiUrl('/api/admin/vehicle-commissions.php')}?${queryParams.toString()}`, {
        headers: {
          ...forceRefreshHeaders
        }
      });
      
      if (response.data?.status === 'success') {
        return {
          payments: response.data.data,
          pagination: response.data.pagination
        };
      } else {
        throw new Error(response.data?.message || 'Failed to fetch commission payments');
      }
    } catch (error) {
      console.error('Error fetching commission payments:', error);
      toast.error('Failed to load commission payments');
      return {
        payments: [],
        pagination: { total: 0, limit: 10, offset: 0 }
      };
    }
  },

  // Create commission payment record
  createCommissionPayment: async (data: Partial<CommissionPayment>) => {
    try {
      const response = await axios.post(getApiUrl('/api/admin/vehicle-commissions.php'), {
        booking_id: data.bookingId,
        vehicle_id: data.vehicleId,
        driver_id: data.driverId,
        total_amount: data.amount,
        commission_amount: data.commissionAmount,
        commission_percentage: data.commissionPercentage,
        status: data.status || 'pending',
        notes: data.notes
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });
      
      if (response.data?.status === 'success') {
        toast.success('Commission payment recorded successfully');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to create commission payment');
      }
    } catch (error) {
      console.error('Error creating commission payment:', error);
      toast.error('Failed to create commission payment');
      throw error;
    }
  },

  // Update commission payment status
  updateCommissionPayment: async (id: string, data: Partial<CommissionPayment>) => {
    try {
      const response = await axios.put(getApiUrl('/api/admin/vehicle-commissions.php'), {
        id,
        status: data.status,
        payment_date: data.paymentDate,
        notes: data.notes
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });
      
      if (response.data?.status === 'success') {
        toast.success('Commission payment updated successfully');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to update commission payment');
      }
    } catch (error) {
      console.error('Error updating commission payment:', error);
      toast.error('Failed to update commission payment');
      throw error;
    }
  },

  // Get commission report
  getCommissionReport: async (startDate: string, endDate: string) => {
    try {
      const response = await axios.get(getApiUrl('/api/admin/vehicle-commissions.php'), {
        headers: {
          ...forceRefreshHeaders
        },
        params: {
          report: 'summary',
          start_date: startDate,
          end_date: endDate
        }
      });
      
      if (response.data?.status === 'success') {
        return response.data.data as CommissionReport;
      } else {
        throw new Error(response.data?.message || 'Failed to get commission report');
      }
    } catch (error) {
      console.error('Error getting commission report:', error);
      toast.error('Failed to load commission report');
      return null;
    }
  }
};
