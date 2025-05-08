
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
  status?: 'completed' | 'pending' | 'cancelled' | 'reconciled' | 'all';
}

export interface LedgerExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  filters?: LedgerFilter;
  email?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
}

// Expense management specific types
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  budgetAmount?: number;
  color?: string;
}

export interface ExpenseEntry extends LedgerTransaction {
  type: 'expense';
  category: string;
  billNumber?: string;
  billDate?: string;
  dueDate?: string;
  vendor?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  budgetId?: string;
}

export interface ExpenseBudget {
  id: string;
  name: string;
  amount: number;
  startDate: string;
  endDate: string;
  categories: {
    categoryId: string;
    amount: number;
  }[];
}

export interface ExpenseSummary {
  totalAmount: number;
  byCategory: {
    category: string;
    amount: number;
    percentage: number;
    budget?: number;
    remaining?: number;
  }[];
  byMonth: {
    month: string;
    amount: number;
  }[];
  byPaymentMethod: {
    method: string;
    amount: number;
    percentage: number;
  }[];
}

// Fixed the ExpenseFilter interface to correctly extend LedgerFilter
export interface ExpenseFilter extends Omit<LedgerFilter, "type" | "category"> {
  category?: string | string[];
  vendor?: string;
  minAmount?: number;
  maxAmount?: number;
  isPaid?: boolean;
}
