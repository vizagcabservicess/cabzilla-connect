
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ExpenseCategory, ExpenseEntry, ExpenseBudget, ExpenseSummary, ExpenseFilter } from "@/types/ledger";
import axios from "axios";

// API base URL - use a relative path to ensure it works in all environments
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

// Generic error handler function
const handleApiError = (error: any, fallbackMsg: string): string => {
  console.error(fallbackMsg, error);
  
  // Check if it's a network error
  if (error.message === 'Network Error') {
    return 'Network error. Please check your internet connection.';
  }
  
  // Check for specific API error message
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  }
  
  return fallbackMsg;
};

/**
 * Fetch all expense categories
 */
const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  try {
    console.log("Fetching expense categories...");
    
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    const response = await axios.get(`${API_BASE_URL}/expenses.php?action=categories&_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    if (response.data.status === 'success') {
      console.log("Categories fetched successfully:", response.data.data);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to fetch expense categories';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      return DEFAULT_EXPENSE_CATEGORIES;
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to fetch expense categories");
    toast.error(errorMsg + ". Using default categories.");
    console.log("Returning default categories due to error");
    return DEFAULT_EXPENSE_CATEGORIES;
  }
};

/**
 * Add a new expense category
 */
const addExpenseCategory = async (category: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> => {
  try {
    console.log("Adding expense category:", category);
    const response = await axios.post(`${API_BASE_URL}/expenses.php`, {
      action: 'add_category',
      ...category
    });
    
    if (response.data.status === 'success') {
      toast.success(`Category "${category.name}" added successfully`);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to add expense category';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to add expense category");
    toast.error(errorMsg);
    throw new Error(errorMsg);
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
    console.log("Fetching expenses with filters:", filters);
    let params: Record<string, any> = {
      _t: new Date().getTime(), // Add timestamp to prevent caching
    };
    
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
    
    const response = await axios.get(`${API_BASE_URL}/expenses.php`, { 
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    if (response.data.status === 'success') {
      console.log("Expenses fetched successfully:", response.data.data);
      return response.data.data || [];
    } else {
      const errorMsg = response.data.message || 'Failed to fetch expenses';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      return [];
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to fetch expenses");
    toast.error(errorMsg);
    console.error("Error details:", error);
    return [];
  }
};

/**
 * Add a new expense
 */
const addExpense = async (expense: Omit<ExpenseEntry, 'id'>): Promise<ExpenseEntry> => {
  try {
    console.log("Adding expense:", expense);
    
    // Ensure date is formatted properly
    const formattedExpense = {
      ...expense,
      date: typeof expense.date === 'object' ? format(expense.date as Date, 'yyyy-MM-dd') : expense.date,
      billDate: expense.billDate && typeof expense.billDate === 'object' 
        ? format(expense.billDate as Date, 'yyyy-MM-dd') 
        : expense.billDate
    };
    
    const response = await axios.post(`${API_BASE_URL}/expenses.php`, {
      ...formattedExpense,
      action: 'add_expense' // Explicitly specify action
    });
    
    if (response.data.status === 'success') {
      toast.success(`Expense "${expense.description}" added successfully`);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to add expense';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to add expense");
    toast.error(errorMsg);
    console.error("Error details:", error);
    throw new Error(errorMsg);
  }
};

/**
 * Update an existing expense
 */
const updateExpense = async (id: string | number, expense: Partial<ExpenseEntry>): Promise<ExpenseEntry> => {
  try {
    console.log("Updating expense:", id, expense);
    
    // Format dates if they're Date objects
    const formattedExpense = {
      ...expense,
      id,
      date: expense.date && typeof expense.date === 'object' 
        ? format(expense.date as Date, 'yyyy-MM-dd') 
        : expense.date,
      billDate: expense.billDate && typeof expense.billDate === 'object' 
        ? format(expense.billDate as Date, 'yyyy-MM-dd') 
        : expense.billDate
    };
    
    const response = await axios.put(`${API_BASE_URL}/expenses.php`, formattedExpense);
    
    if (response.data.status === 'success') {
      toast.success(`Expense "${expense.description}" updated successfully`);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to update expense';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to update expense");
    toast.error(errorMsg);
    console.error("Error details:", error);
    throw new Error(errorMsg);
  }
};

/**
 * Delete an expense
 */
const deleteExpense = async (id: string | number): Promise<boolean> => {
  try {
    console.log("Deleting expense:", id);
    const response = await axios.delete(`${API_BASE_URL}/expenses.php`, {
      params: { id }
    });
    
    if (response.data.status === 'success') {
      toast.success("Expense deleted successfully");
      return true;
    } else {
      const errorMsg = response.data.message || 'Failed to delete expense';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      return false;
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to delete expense");
    toast.error(errorMsg);
    console.error("Error details:", error);
    return false;
  }
};

/**
 * Get expense summary for dashboard and reports
 */
const getExpenseSummary = async (dateRange?: DateRange): Promise<ExpenseSummary> => {
  try {
    console.log("Getting expense summary with dateRange:", dateRange);
    const params = {
      action: 'summary',
      _t: new Date().getTime(), // Add timestamp to prevent caching
      ...prepareDateRangeParams(dateRange)
    };
    
    const response = await axios.get(`${API_BASE_URL}/expenses.php`, { 
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    if (response.data.status === 'success') {
      console.log("Summary fetched successfully:", response.data.data);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to generate expense summary';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      
      // Return empty summary on error
      return {
        totalAmount: 0,
        byCategory: [],
        byMonth: [],
        byPaymentMethod: [],
      };
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to generate expense summary");
    toast.error(errorMsg);
    console.error("Error details:", error);
    
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
