
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ExpenseCategory, ExpenseEntry, ExpenseBudget, ExpenseSummary, ExpenseFilter } from "@/types/ledger";

// Define expense categories
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
    // In a real implementation, this would call an API
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // For now, return the default categories
    return DEFAULT_EXPENSE_CATEGORIES;
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    toast.error("Failed to fetch expense categories");
    return DEFAULT_EXPENSE_CATEGORIES;
  }
};

/**
 * Add a new expense category
 */
const addExpenseCategory = async (category: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a random ID (in a real app, this would come from the backend)
    const newCategory: ExpenseCategory = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    
    toast.success(`Category "${category.name}" added successfully`);
    return newCategory;
  } catch (error) {
    console.error("Error adding expense category:", error);
    toast.error("Failed to add expense category");
    throw error;
  }
};

/**
 * Fetch expenses with optional filters
 */
const fetchExpenses = async (filters?: ExpenseFilter): Promise<ExpenseEntry[]> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate mock expense data with consideration for filters
    const expenses = generateMockExpenses();
    
    // Apply filters if provided
    let filteredExpenses = [...expenses];
    
    if (filters) {
      // Filter by date range
      if (filters.dateRange) {
        filteredExpenses = filteredExpenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          if (filters.dateRange?.from && expenseDate < filters.dateRange.from) return false;
          if (filters.dateRange?.to && expenseDate > filters.dateRange.to) return false;
          return true;
        });
      }
      
      // Filter by category
      if (filters.category) {
        if (Array.isArray(filters.category)) {
          filteredExpenses = filteredExpenses.filter(expense => 
            filters.category?.includes(expense.category));
        } else {
          filteredExpenses = filteredExpenses.filter(expense => 
            expense.category === filters.category);
        }
      }
      
      // Filter by payment method
      if (filters.paymentMethod) {
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.paymentMethod === filters.paymentMethod);
      }
      
      // Filter by vendor
      if (filters.vendor) {
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.vendor?.toLowerCase().includes(filters.vendor!.toLowerCase()));
      }
      
      // Filter by amount range
      if (filters.minAmount !== undefined) {
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.amount >= filters.minAmount!);
      }
      
      if (filters.maxAmount !== undefined) {
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.amount <= filters.maxAmount!);
      }
      
      // Filter by status
      if (filters.status && filters.status !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.status === filters.status);
      }
    }
    
    return filteredExpenses;
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
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // In a real app, the ID would be generated on the server
    const newExpense: ExpenseEntry = {
      ...expense,
      id: `exp-${Date.now()}`,
      type: 'expense',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    toast.success(`Expense "${expense.description}" added successfully`);
    return newExpense;
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
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, the updated expense would come from the server
    const updatedExpense: ExpenseEntry = {
      ...expense,
      id,
      type: 'expense',
      updated_at: new Date().toISOString(),
    } as ExpenseEntry;
    
    toast.success(`Expense "${expense.description}" updated successfully`);
    return updatedExpense;
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
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    toast.success("Expense deleted successfully");
    return true;
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
    // Fetch expenses first
    const expenses = await fetchExpenses({ dateRange });
    
    // Calculate total amount
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Group by category
    const categoriesMap: Record<string, number> = {};
    expenses.forEach(exp => {
      if (!categoriesMap[exp.category]) {
        categoriesMap[exp.category] = 0;
      }
      categoriesMap[exp.category] += exp.amount;
    });
    
    // Convert to expected format
    const byCategory = Object.entries(categoriesMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }));
    
    // Group by month
    const monthsMap: Record<string, number> = {};
    expenses.forEach(exp => {
      const month = exp.date.substring(0, 7); // YYYY-MM
      if (!monthsMap[month]) {
        monthsMap[month] = 0;
      }
      monthsMap[month] += exp.amount;
    });
    
    // Convert to expected format
    const byMonth = Object.entries(monthsMap).map(([month, amount]) => ({
      month,
      amount,
    }));
    
    // Group by payment method
    const methodsMap: Record<string, number> = {};
    expenses.forEach(exp => {
      const method = exp.paymentMethod || 'Unknown';
      if (!methodsMap[method]) {
        methodsMap[method] = 0;
      }
      methodsMap[method] += exp.amount;
    });
    
    // Convert to expected format
    const byPaymentMethod = Object.entries(methodsMap).map(([method, amount]) => ({
      method,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }));
    
    // Return the complete summary
    return {
      totalAmount,
      byCategory,
      byMonth,
      byPaymentMethod,
    };
  } catch (error) {
    console.error("Error getting expense summary:", error);
    toast.error("Failed to generate expense summary");
    return {
      totalAmount: 0,
      byCategory: [],
      byMonth: [],
      byPaymentMethod: [],
    };
  }
};

/**
 * Helper function to generate mock expenses
 */
function generateMockExpenses(): ExpenseEntry[] {
  const currentDate = new Date();
  const expenses: ExpenseEntry[] = [];
  const categories = DEFAULT_EXPENSE_CATEGORIES;
  const paymentMethods = ['Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'UPI'];
  const statuses = ['pending', 'reconciled'] as const;
  const vendors = [
    'Google Ads', 'Facebook', 'Electricity Board', 'Water Supply Corp', 
    'Internet Provider', 'Office Space Leasing', 'Garage Rent', 'Local Restaurant',
    'Office Supplies Store', 'Cleaning Service', 'IT Support', 'Mobile Provider'
  ];
  
  // Generate data for the last 3 months
  for (let i = 0; i < 3; i++) {
    const monthStart = startOfMonth(subMonths(currentDate, i));
    const monthEnd = endOfMonth(subMonths(currentDate, i));
    const daysInMonth = (monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24);
    
    // Generate 15-25 expenses per month
    const expensesCount = Math.floor(Math.random() * 10) + 15;
    
    for (let j = 0; j < expensesCount; j++) {
      // Random day in the month
      const dayOffset = Math.floor(Math.random() * daysInMonth);
      const expenseDate = new Date(monthStart);
      expenseDate.setDate(expenseDate.getDate() + dayOffset);
      
      // Random category
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      // Generate expense based on category
      let description = '';
      let amount = 0;
      let vendor = '';
      
      switch(category.id) {
        case 'marketing':
          vendor = Math.random() > 0.5 ? 'Google Ads' : 'Facebook';
          description = `${vendor} campaign`;
          amount = Math.floor(Math.random() * 20000) + 5000;
          break;
        case 'utilities':
          vendor = Math.random() > 0.6 ? 'Electricity Board' : Math.random() > 0.5 ? 'Water Supply Corp' : 'Internet Provider';
          description = `${vendor} bill payment`;
          amount = Math.floor(Math.random() * 3000) + 1000;
          break;
        case 'rent':
          vendor = Math.random() > 0.5 ? 'Office Space Leasing' : 'Garage Rent';
          description = `${vendor} for ${format(expenseDate, 'MMMM yyyy')}`;
          amount = Math.floor(Math.random() * 15000) + 10000;
          break;
        case 'maintenance':
          vendor = Math.random() > 0.5 ? 'Cleaning Service' : 'IT Support';
          description = `${vendor} charges`;
          amount = Math.floor(Math.random() * 5000) + 1000;
          break;
        case 'parties':
          vendor = 'Local Restaurant';
          description = `Team ${Math.random() > 0.5 ? 'lunch' : 'dinner'}`;
          amount = Math.floor(Math.random() * 4000) + 2000;
          break;
        default:
          vendor = vendors[Math.floor(Math.random() * vendors.length)];
          description = `${category.name} expense`;
          amount = Math.floor(Math.random() * 3000) + 500;
      }
      
      // Random payment method
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      // Random status (mostly reconciled for past expenses)
      const status = i === 0 && Math.random() > 0.7 ? 'pending' : 'reconciled';
      
      // Create the expense entry
      expenses.push({
        id: `exp-${expenses.length + 1}`,
        date: format(expenseDate, 'yyyy-MM-dd'),
        description,
        amount,
        type: 'expense',
        category: category.id,
        paymentMethod,
        vendor,
        status,
        billNumber: `BILL-${Math.floor(Math.random() * 10000)}`,
        billDate: format(expenseDate, 'yyyy-MM-dd'),
      });
    }
  }
  
  // Sort expenses by date (newest first)
  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const expenseAPI = {
  fetchExpenseCategories,
  addExpenseCategory,
  fetchExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
