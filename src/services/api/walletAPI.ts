
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { authAPI } from './authAPI';

const WALLET_API_URL = getApiUrl('/api/pooling/wallet.php');

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  locked_amount: number;
  total_earnings: number;
  total_spent: number;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  type: 'credit' | 'debit' | 'lock' | 'unlock';
  amount: number;
  purpose: string;
  description: string;
  balance_after: number;
  status: string;
  created_at: string;
}

export interface WalletResponse {
  success: boolean;
  wallet: Wallet;
  transactions: WalletTransaction[];
  can_offer_rides: boolean;
}

export const walletAPI = {
  async getWallet(): Promise<WalletResponse> {
    try {
      const token = authAPI.getToken();
      const response = await axios.get(WALLET_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet:', error);
      throw error;
    }
  },

  async checkMinimumBalance(): Promise<{ success: boolean; can_offer_rides: boolean; balance: number; shortfall: number }> {
    try {
      const token = authAPI.getToken();
      const response = await axios.post(`${WALLET_API_URL}?action=check-balance`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error checking balance:', error);
      throw error;
    }
  },

  async deposit(amount: number): Promise<{ success: boolean; message: string; new_balance: number }> {
    try {
      const token = authAPI.getToken();
      const response = await axios.post(`${WALLET_API_URL}?action=deposit`, 
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Error depositing to wallet:', error);
      throw error;
    }
  },

  async withdraw(amount: number): Promise<{ success: boolean; message: string; new_balance: number }> {
    try {
      const token = authAPI.getToken();
      const response = await axios.post(`${WALLET_API_URL}?action=withdraw`, 
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Error withdrawing from wallet:', error);
      throw error;
    }
  }
};
