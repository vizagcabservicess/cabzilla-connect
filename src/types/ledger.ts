
import { DateRange } from "react-day-picker";

export interface LedgerTransaction {
  id: number | string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'emi';
  category?: string;
  reference?: string;
  paymentMethod?: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  projectId?: string;
  notes?: string;
  status?: 'reconciled' | 'pending';
  created_at?: string;
  updated_at?: string;
}

export interface LedgerSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  cashAccepted?: number;
  inBankAccount?: number;
  pendingPayments?: number;
}

export interface LedgerFilter {
  dateRange?: DateRange;
  type: 'income' | 'expense' | 'emi' | 'all';
  category?: string;
  paymentMethod?: string;
  entity?: {
    type: 'vehicle' | 'driver' | 'customer' | 'project';
    id: string;
  };
  status?: 'completed' | 'pending' | 'cancelled' | 'all';
}

export interface LedgerExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  filters?: LedgerFilter;
  email?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
}
