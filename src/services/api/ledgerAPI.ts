
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { LedgerTransaction, LedgerFilters, CreateLedgerTransaction } from '@/types/api';

const API_BASE_URL = getApiUrl();

export const ledgerAPI = {
  /**
   * Get all transactions with optional filters
   */
  getTransactions: async (filters?: LedgerFilters): Promise<any> => {
    try {
      const params: Record<string, string> = {};
      
      if (filters?.startDate) {
        params.start_date = filters.startDate;
      }
      
      if (filters?.endDate) {
        params.end_date = filters.endDate;
      }
      
      if (filters?.type) {
        params.type = filters.type;
      }
      
      if (filters?.category) {
        params.category = filters.category;
      }
      
      if (filters?.vehicleId) {
        params.vehicle_id = filters.vehicleId;
      }
      
      const response = await axios.get(`${API_BASE_URL}/admin/ledger.php`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },
  
  /**
   * Create a new transaction
   */
  createTransaction: async (transaction: CreateLedgerTransaction): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/ledger.php`, transaction);
      return response.data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }
};

export default ledgerAPI;
