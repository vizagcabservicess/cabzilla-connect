
import axios from 'axios';
import { getApiUrl } from '@/config/api';

interface Transaction {
  id: number;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  paymentMethod: string;
  reference: string;
  bookingId?: number | null;
  vehicleId?: string | null;
  balance: number;
}

interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  vehicleId?: string;
}

interface CreateTransactionRequest {
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  paymentMethod: string;
  reference?: string;
  bookingId?: number;
  vehicleId?: string;
}

interface TransactionResponse {
  status: string;
  transactions?: Transaction[];
  summary?: TransactionSummary;
  categories?: string[];
  message?: string;
  transaction?: Transaction;
}

const API_BASE_URL = getApiUrl();

export const ledgerAPI = {
  /**
   * Get all transactions with optional filters
   */
  getTransactions: async (filters?: TransactionFilters): Promise<TransactionResponse> => {
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
  createTransaction: async (transaction: CreateTransactionRequest): Promise<TransactionResponse> => {
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
