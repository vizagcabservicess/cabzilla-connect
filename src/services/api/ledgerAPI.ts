
import axios from 'axios';
import { getApiUrl } from '@/config/api';

// Define the types if they don't exist in the API types
export interface LedgerTransaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  category: string;
  paymentMethod: string;
  amount: number;
  balance: number;
  vehicleId?: string;
}

export interface LedgerFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  vehicleId?: string;
}

export interface CreateLedgerTransaction {
  date: string;
  description: string;
  type: 'income' | 'expense';
  category: string;
  paymentMethod: string;
  amount: number;
  vehicleId?: string;
}

const API_BASE_URL = getApiUrl('/');

export const ledgerAPI = {
  /**
   * Get all transactions with optional filters
   */
  getTransactions: async (filters: LedgerFilters = {}): Promise<{
    transactions: LedgerTransaction[];
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  }> => {
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
