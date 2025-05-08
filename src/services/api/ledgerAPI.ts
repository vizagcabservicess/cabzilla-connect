
import axios from 'axios';
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';

// Types for ledger data
export interface LedgerEntry {
  id: string | number;
  date: string;
  description: string;
  type: 'income' | 'expense' | 'emi';
  amount: number;
  category: string;
  paymentMethod: string;
  reference?: string;
  balance: number;
  status?: 'completed' | 'pending' | 'cancelled';
  entityId?: string;
  entityType?: 'vehicle' | 'driver' | 'customer' | 'project';
}

export interface LedgerSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  cashAccepted: number;
  inBankAccount: number;
  pendingPayments: number;
}

export interface VehicleEmi {
  id: string | number;
  vehicleId: string;
  vehicleNumber: string;
  emiAmount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  bankName: string;
  loanRef: string;
}

export interface LedgerFilter {
  dateRange?: DateRange;
  type?: 'income' | 'expense' | 'emi' | 'all';
  paymentMethod?: string | string[];
  category?: string | string[];
  entityType?: 'vehicle' | 'driver' | 'customer' | 'project';
  entityId?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: 'completed' | 'pending' | 'cancelled' | 'all';
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface PaymentMethodSummary {
  method: string;
  amount: number;
  count: number;
}

export interface EntitySummary {
  id: string;
  name: string;
  income: number;
  expense: number;
  balance: number;
}

// Ledger API service
const fetchLedgerEntries = async (filters?: LedgerFilter): Promise<LedgerEntry[]> => {
  try {
    // In a real implementation, this would be an API call with filter parameters
    // For now, we'll simulate a delay and return mock data
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data
    const mockData: LedgerEntry[] = generateMockLedgerEntries(filters);
    console.log("Fetched ledger entries with filters:", filters);
    
    return mockData;
  } catch (error) {
    console.error("Error fetching ledger entries:", error);
    throw error;
  }
};

const fetchLedgerSummary = async (filters?: LedgerFilter): Promise<LedgerSummary> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate mock summary
    const entries = await fetchLedgerEntries(filters);
    const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = entries.filter(e => e.type === 'expense' || e.type === 'emi').reduce((sum, e) => sum + e.amount, 0);
    
    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      cashAccepted: entries.filter(e => e.type === 'income' && e.paymentMethod === 'Cash').reduce((sum, e) => sum + e.amount, 0),
      inBankAccount: entries.filter(e => e.type === 'income' && ['Bank Transfer', 'Card'].includes(e.paymentMethod)).reduce((sum, e) => sum + e.amount, 0),
      pendingPayments: entries.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
    };
  } catch (error) {
    console.error("Error fetching ledger summary:", error);
    throw error;
  }
};

const fetchCategorySummaries = async (filters?: LedgerFilter): Promise<CategorySummary[]> => {
  try {
    const entries = await fetchLedgerEntries(filters);
    
    // Group by category and calculate summaries
    const categories: Record<string, CategorySummary> = {};
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    
    entries.forEach(entry => {
      if (!categories[entry.category]) {
        categories[entry.category] = {
          category: entry.category,
          amount: 0,
          percentage: 0,
          count: 0
        };
      }
      
      categories[entry.category].amount += entry.amount;
      categories[entry.category].count += 1;
    });
    
    // Calculate percentages
    return Object.values(categories).map(cat => ({
      ...cat,
      percentage: (cat.amount / totalAmount) * 100
    }));
  } catch (error) {
    console.error("Error fetching category summaries:", error);
    throw error;
  }
};

const fetchPaymentMethodSummaries = async (filters?: LedgerFilter): Promise<PaymentMethodSummary[]> => {
  try {
    const entries = await fetchLedgerEntries(filters);
    
    // Group by payment method and calculate summaries
    const methods: Record<string, PaymentMethodSummary> = {};
    
    entries.forEach(entry => {
      if (!methods[entry.paymentMethod]) {
        methods[entry.paymentMethod] = {
          method: entry.paymentMethod,
          amount: 0,
          count: 0
        };
      }
      
      methods[entry.paymentMethod].amount += entry.amount;
      methods[entry.paymentMethod].count += 1;
    });
    
    return Object.values(methods);
  } catch (error) {
    console.error("Error fetching payment method summaries:", error);
    throw error;
  }
};

const fetchVehicleEmis = async (): Promise<VehicleEmi[]> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock EMI data
    return [
      { id: 1, vehicleId: 'VEH001', vehicleNumber: 'AP 31 AB 1234', emiAmount: 12500, dueDate: '2025-05-15', status: 'pending', bankName: 'HDFC Bank', loanRef: 'LOAN-1234' },
      { id: 2, vehicleId: 'VEH002', vehicleNumber: 'AP 31 CD 5678', emiAmount: 8500, dueDate: '2025-05-20', status: 'pending', bankName: 'ICICI Bank', loanRef: 'LOAN-5678' },
      { id: 3, vehicleId: 'VEH003', vehicleNumber: 'AP 31 EF 9012', emiAmount: 15000, dueDate: '2025-05-05', status: 'paid', bankName: 'SBI', loanRef: 'LOAN-9012' },
      { id: 4, vehicleId: 'VEH004', vehicleNumber: 'AP 31 GH 3456', emiAmount: 10200, dueDate: '2025-05-25', status: 'pending', bankName: 'Axis Bank', loanRef: 'LOAN-3456' },
      { id: 5, vehicleId: 'VEH005', vehicleNumber: 'AP 31 IJ 7890', emiAmount: 9300, dueDate: '2025-04-30', status: 'overdue', bankName: 'Kotak Bank', loanRef: 'LOAN-7890' }
    ];
  } catch (error) {
    console.error("Error fetching vehicle EMIs:", error);
    throw error;
  }
};

const fetchEntitySummaries = async (entityType: 'vehicle' | 'driver' | 'customer' | 'project'): Promise<EntitySummary[]> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Mock entity summaries
    if (entityType === 'vehicle') {
      return [
        { id: 'VEH001', name: 'AP 31 AB 1234', income: 35000, expense: 22500, balance: 12500 },
        { id: 'VEH002', name: 'AP 31 CD 5678', income: 28000, expense: 18500, balance: 9500 },
        { id: 'VEH003', name: 'AP 31 EF 9012', income: 42000, expense: 31000, balance: 11000 }
      ];
    } else if (entityType === 'driver') {
      return [
        { id: 'DRV001', name: 'Rajesh Kumar', income: 22000, expense: 3500, balance: 18500 },
        { id: 'DRV002', name: 'Suresh Singh', income: 25000, expense: 4200, balance: 20800 },
        { id: 'DRV003', name: 'Mahesh Reddy', income: 19000, expense: 3000, balance: 16000 }
      ];
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching ${entityType} summaries:`, error);
    throw error;
  }
};

const exportLedger = async (format: 'csv' | 'excel' | 'pdf', filters?: LedgerFilter): Promise<Blob | null> => {
  try {
    console.log(`Exporting ledger in ${format} format with filters:`, filters);
    
    // In a real implementation, this would call a backend API to generate the export
    // For now, we'll just log and return null
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return null;
  } catch (error) {
    console.error(`Error exporting ledger as ${format}:`, error);
    throw error;
  }
};

// Helper function to generate mock ledger data
function generateMockLedgerEntries(filters?: LedgerFilter): LedgerEntry[] {
  // Define some base data
  const categories = {
    income: ['Trip Revenue', 'Package Revenue', 'Airport Transfer', 'Corporate Booking', 'Other Income'],
    expense: ['Fuel', 'Maintenance', 'Insurance', 'Driver Salary', 'Office Rent', 'Vehicle EMI', 'Other Expenses']
  };
  
  const paymentMethods = ['Cash', 'Bank Transfer', 'Card', 'UPI', 'Wallet'];
  
  // Generate 30 entries spanning the last month
  const entries: LedgerEntry[] = [];
  let balance = 250000; // Starting balance
  
  // Current date minus 30 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Generate 1-3 entries per day
    const entriesPerDay = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < entriesPerDay; j++) {
      // Randomly decide if this is income or expense
      const type = Math.random() > 0.4 ? 'income' : 'expense';
      
      // Generate a realistic amount
      const amount = type === 'income' 
        ? Math.floor(Math.random() * 5000) + 1000 
        : Math.floor(Math.random() * 3000) + 500;
      
      // Update the balance
      if (type === 'income') {
        balance += amount;
      } else {
        balance -= amount;
      }
      
      // Select a random category based on type
      const category = type === 'income'
        ? categories.income[Math.floor(Math.random() * categories.income.length)]
        : categories.expense[Math.floor(Math.random() * categories.expense.length)];
      
      // Select a random payment method
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      // Generate a reference number
      const reference = type === 'income'
        ? `ORD-${Math.floor(Math.random() * 10000)}`
        : `INV-${Math.floor(Math.random() * 10000)}`;
      
      // Determine status (mostly completed, some pending)
      const status = Math.random() > 0.85 ? 'pending' : 'completed';
      
      // Generate a description
      const description = type === 'income'
        ? `${category} - ${reference}`
        : `${category} payment - ${reference}`;
      
      // Add entity data for some entries
      let entityId;
      let entityType;
      
      if (Math.random() > 0.5) {
        entityType = Math.random() > 0.5 ? 'vehicle' : 'driver';
        entityId = entityType === 'vehicle' 
          ? `VEH00${Math.floor(Math.random() * 5) + 1}` 
          : `DRV00${Math.floor(Math.random() * 3) + 1}`;
      }
      
      // Create the entry
      entries.push({
        id: `TRX-${date.getTime()}-${j}`,
        date: format(date, 'yyyy-MM-dd'),
        description,
        type,
        amount,
        category,
        paymentMethod,
        reference,
        balance,
        status,
        entityId,
        entityType
      });
    }
  }
  
  // Apply filters if provided
  if (filters) {
    return entries.filter(entry => {
      // Filter by date range
      if (filters.dateRange) {
        const entryDate = new Date(entry.date);
        if (filters.dateRange.from && entryDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && entryDate > filters.dateRange.to) return false;
      }
      
      // Filter by type
      if (filters.type && filters.type !== 'all' && entry.type !== filters.type) return false;
      
      // Filter by payment method
      if (filters.paymentMethod) {
        if (Array.isArray(filters.paymentMethod)) {
          if (!filters.paymentMethod.includes(entry.paymentMethod)) return false;
        } else if (entry.paymentMethod !== filters.paymentMethod) {
          return false;
        }
      }
      
      // Filter by category
      if (filters.category) {
        if (Array.isArray(filters.category)) {
          if (!filters.category.includes(entry.category)) return false;
        } else if (entry.category !== filters.category) {
          return false;
        }
      }
      
      // Filter by entity
      if (filters.entityType && entry.entityType !== filters.entityType) return false;
      if (filters.entityId && entry.entityId !== filters.entityId) return false;
      
      // Filter by search
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!entry.description.toLowerCase().includes(search) &&
            !entry.reference?.toLowerCase().includes(search)) {
          return false;
        }
      }
      
      // Filter by amount range
      if (filters.minAmount !== undefined && entry.amount < filters.minAmount) return false;
      if (filters.maxAmount !== undefined && entry.amount > filters.maxAmount) return false;
      
      // Filter by status
      if (filters.status && filters.status !== 'all' && entry.status !== filters.status) return false;
      
      return true;
    });
  }
  
  return entries;
}

const updateEmiStatus = async (emiId: string | number, status: 'paid' | 'pending' | 'overdue'): Promise<void> => {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`EMI ${emiId} status updated to ${status}`);
  } catch (error) {
    console.error("Error updating EMI status:", error);
    throw error;
  }
};

const scheduleExport = async (format: 'pdf' | 'excel' | 'csv', email: string, frequency: 'daily' | 'weekly' | 'monthly'): Promise<void> => {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Scheduled ${format} export to ${email} with frequency: ${frequency}`);
  } catch (error) {
    console.error("Error scheduling export:", error);
    throw error;
  }
};

export const ledgerAPI = {
  fetchLedgerEntries,
  fetchLedgerSummary,
  fetchCategorySummaries,
  fetchPaymentMethodSummaries,
  fetchVehicleEmis,
  fetchEntitySummaries,
  exportLedger,
  updateEmiStatus,
  scheduleExport
};
