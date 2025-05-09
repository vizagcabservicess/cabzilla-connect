
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ExpenseCategory, ExpenseEntry, ExpenseBudget, ExpenseSummary, ExpenseFilter } from "@/types/ledger";
import axios from "axios";

// API base URL
const API_BASE_URL = '/api/admin';

// Default expense categories for fallback
const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'marketing', name: 'Marketing', description: 'Marketing and advertising expenses', color: '#F97316' },
  { id: 'utilities', name: 'Utilities', description: 'Electricity, water, internet bills', color: '#0EA5E9' },
  { id: 'rent', name: 'Rent', description: 'Office and garage rent', color: '#8B5CF6' },
  { id: 'maintenance', name: 'Maintenance', description: 'Office and equipment maintenance', color: '#22C55E' },
  { id: 'salaries', name: 'Salaries', description: 'Staff salaries excluding drivers', color: '#EF4444' },
  { id: 'misc', name: 'Miscellaneous', description: 'Other business expenses', color: '#6B7280' },
  { id: 'parties', name: 'Events', description: 'Team events and parties', color: '#EC4899' },
];

/**
 * Fetch all expense categories
 */
const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/expenses.php?action=categories`);
    
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch expense categories');
    }
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    toast.error("Failed to fetch expense categories. Using default categories.");
    return DEFAULT_EXPENSE_CATEGORIES;
  }
};

/**
 * Add a new expense category
 */
const addExpenseCategory = async (category: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/expenses.php`, {
      action: 'add_category',
      ...category
    });
    
    if (response.data.status === 'success') {
      toast.success(`Category "${category.name}" added successfully`);
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to add expense category');
    }
  } catch (error) {
    console.error("Error adding expense category:", error);
    toast.error("Failed to add expense category");
    throw error;
  }
};

/**
 * Prepare date range parameters for API requests
 */
const prepareDateRangeParams = (dateRange?: DateRange) => {
  const params: Record<string, string> = {};
  
  if (dateRange?.from) {
    params.from_date = format(dateRange.from, 'yyyy-MM-dd');
  }
  
  if (dateRange?.to) {
    params.to_date = format(dateRange.to, 'yyyy-MM-dd');
  }
  
  return params;
};

/**
 * Fetch expenses with optional filters
 */
const fetchExpenses = async (filters?: ExpenseFilter): Promise<ExpenseEntry[]> => {
  try {
    let params: Record<string, any> = {};
    
    if (filters) {
      // Add date range parameters
      if (filters.dateRange) {
        params = {...params, ...prepareDateRangeParams(filters.dateRange)};
      }
      
      // Add category filter
      if (filters.category) {
        if (Array.isArray(filters.category)) {
          params.category = filters.category.join(',');
        } else {
          params.category = filters.category;
        }
      }
      
      // Add payment method filter
      if (filters.paymentMethod) {
        params.payment_method = filters.paymentMethod;
      }
      
      // Add vendor filter
      if (filters.vendor) {
        params.vendor = filters.vendor;
      }
      
      // Add status filter
      if (filters.status) {
        params.status = filters.status;
      }
      
      // Add amount range filters
      if (filters.minAmount !== undefined) {
        params.min_amount = filters.minAmount;
      }
      
      if (filters.maxAmount !== undefined) {
        params.max_amount = filters.maxAmount;
      }
    }
    
    const response = await axios.get(`${API_BASE_URL}/expenses.php`, { params });
    
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch expenses');
    }
  } catch (error) {
    console.error("Error fetching expenses:", error);
    toast.error("Failed to fetch expenses");
    return [];
  }
};

/**
 * Add a new expense
 */
const addExpense = async (expense: Omit<ExpenseEntry, 'id'>): Promise<ExpenseEntry> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/expenses.php`, expense);
    
    if (response.data.status === 'success') {
      toast.success(`Expense "${expense.description}" added successfully`);
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to add expense');
    }
  } catch (error) {
    console.error("Error adding expense:", error);
    toast.error("Failed to add expense");
    throw error;
  }
};

/**
 * Update an existing expense
 */
const updateExpense = async (id: string | number, expense: Partial<ExpenseEntry>): Promise<ExpenseEntry> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/expenses.php`, {
      id,
      ...expense
    });
    
    if (response.data.status === 'success') {
      toast.success(`Expense "${expense.description}" updated successfully`);
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update expense');
    }
  } catch (error) {
    console.error("Error updating expense:", error);
    toast.error("Failed to update expense");
    throw error;
  }
};

/**
 * Delete an expense
 */
const deleteExpense = async (id: string | number): Promise<boolean> => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/expenses.php`, {
      params: { id }
    });
    
    if (response.data.status === 'success') {
      toast.success("Expense deleted successfully");
      return true;
    } else {
      throw new Error(response.data.message || 'Failed to delete expense');
    }
  } catch (error) {
    console.error("Error deleting expense:", error);
    toast.error("Failed to delete expense");
    return false;
  }
};

/**
 * Get expense summary for dashboard and reports
 */
const getExpenseSummary = async (dateRange?: DateRange): Promise<ExpenseSummary> => {
  try {
    const params = {
      action: 'summary',
      ...prepareDateRangeParams(dateRange)
    };
    
    const response = await axios.get(`${API_BASE_URL}/expenses.php`, { params });
    
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to generate expense summary');
    }
  } catch (error) {
    console.error("Error getting expense summary:", error);
    toast.error("Failed to generate expense summary");
    
    // Return empty summary on error
    return {
      totalAmount: 0,
      byCategory: [],
      byMonth: [],
      byPaymentMethod: [],
    };
  }
};

export const expenseAPI = {
  fetchExpenseCategories,
  addExpenseCategory,
  fetchExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
