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
  status?: 'completed' | 'pending' | 'cancelled' | 'reconciled';
  entityId?: string;
  entityType?: 'vehicle' | 'driver' | 'customer' | 'project';
  notes?: string;
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

// Helper function to format date for API
const formatDateForApi = (date: Date | undefined): string | undefined => {
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
};

// Helper function to build API params from filters
const buildApiParams = (filters?: LedgerFilter) => {
  if (!filters) return {};
  
  const params: Record<string, any> = {};
  
  // Date range filter
  if (filters.dateRange?.from) {
    params.from_date = formatDateForApi(filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    params.to_date = formatDateForApi(filters.dateRange.to);
  }
  
  // Type filter
  if (filters.type && filters.type !== 'all') {
    params.type = filters.type;
  }
  
  // Payment method filter
  if (filters.paymentMethod) {
    if (Array.isArray(filters.paymentMethod)) {
      params.payment_method = filters.paymentMethod.join(',');
    } else {
      params.payment_method = filters.paymentMethod;
    }
  }
  
  // Category filter
  if (filters.category) {
    if (Array.isArray(filters.category)) {
      params.category = filters.category.join(',');
    } else {
      params.category = filters.category;
    }
  }
  
  // Entity filter
  if (filters.entityType) params.entity_type = filters.entityType;
  if (filters.entityId) params.entity_id = filters.entityId;
  
  // Search filter
  if (filters.search) params.search = filters.search;
  
  // Amount range filter
  if (filters.minAmount !== undefined) params.min_amount = filters.minAmount;
  if (filters.maxAmount !== undefined) params.max_amount = filters.maxAmount;
  
  // Status filter
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  
  return params;
};

// Ledger API service
const fetchLedgerEntries = async (filters?: LedgerFilter): Promise<LedgerEntry[]> => {
  try {
    const params = buildApiParams(filters);
    const response = await axios.get('/api/admin/ledger.php', { params });
    
    // Debug: log the full response
    console.log('Ledger API response:', response);
    
    if (!response.data || !Array.isArray(response.data.data)) {
      console.error('Ledger API: Unexpected response format', response.data);
      return [];
    }
    // Map response data to match our interface
    return response.data.data.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      description: entry.description,
      type: entry.type,
      amount: Number(entry.amount),
      category: entry.category,
      paymentMethod: entry.payment_method,
      reference: entry.reference,
      balance: Number(entry.balance),
      status: entry.status,
      entityId: entry.entity_id,
      entityType: entry.entity_type
    }));
  } catch (error) {
    console.error("Error fetching ledger entries:", error);
    // Debug: log error details
    if (error.response) {
      console.error('Ledger API error response:', error.response.data);
    }
    // Return empty array on error
    return [];
  }
};

const fetchLedgerSummary = async (filters?: LedgerFilter): Promise<LedgerSummary> => {
  try {
    const params = {
      ...buildApiParams(filters),
      action: 'summary'
    };
    
    const response = await axios.get('/api/admin/ledger.php', { params });
    
    // Response from API already matches our interface
    return response.data.data;
  } catch (error) {
    console.error("Error fetching ledger summary:", error);
    // Return default values on error
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      cashAccepted: 0,
      inBankAccount: 0,
      pendingPayments: 0
    };
  }
};

const fetchCategorySummaries = async (filters?: LedgerFilter): Promise<CategorySummary[]> => {
  try {
    const params = {
      ...buildApiParams(filters),
      action: 'categories'
    };
    
    const response = await axios.get('/api/admin/ledger.php', { params });
    
    // Response from API already matches our interface
    return response.data.data;
  } catch (error) {
    console.error("Error fetching category summaries:", error);
    // Return empty array on error
    return [];
  }
};

const fetchPaymentMethodSummaries = async (filters?: LedgerFilter): Promise<PaymentMethodSummary[]> => {
  try {
    const params = {
      ...buildApiParams(filters),
      action: 'payment-methods'
    };
    
    const response = await axios.get('/api/admin/ledger.php', { params });
    
    // Response from API already matches our interface
    return response.data.data;
  } catch (error) {
    console.error("Error fetching payment method summaries:", error);
    // Return empty array on error
    return [];
  }
};

const fetchVehicleEmis = async (): Promise<VehicleEmi[]> => {
  try {
    const params = {
      action: 'vehicle-emis'
    };
    
    const response = await axios.get('/api/admin/ledger.php', { params });
    
    // Response from API already matches our interface
    return response.data.data;
  } catch (error) {
    console.error("Error fetching vehicle EMIs:", error);
    // Return empty array on error
    return [];
  }
};

const fetchEntitySummaries = async (entityType: 'vehicle' | 'driver' | 'customer' | 'project'): Promise<EntitySummary[]> => {
  try {
    const params = {
      action: 'entity-summaries',
      entity_type: entityType
    };
    
    const response = await axios.get('/api/admin/ledger.php', { params });
    
    // Response from API already matches our interface
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching ${entityType} summaries:`, error);
    // Return empty array on error
    return [];
  }
};

const exportLedger = async (format: 'csv' | 'excel' | 'pdf', filters?: LedgerFilter): Promise<Blob | null> => {
  try {
    const params = {
      ...buildApiParams(filters),
      format
    };
    
    // Make API call with responseType set to blob
    const response = await axios.get('/api/admin/ledger/export', { 
      params,
      responseType: 'blob'
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error exporting ledger as ${format}:`, error);
    return null;
  }
};

const updateEmiStatus = async (emiId: string | number, status: 'paid' | 'pending' | 'overdue'): Promise<void> => {
  try {
    await axios.put(`/api/admin/ledger.php?id=${emiId}`, {
      status
    });
  } catch (error) {
    console.error("Error updating EMI status:", error);
    throw error;
  }
};

const scheduleExport = async (format: 'pdf' | 'excel' | 'csv', email: string, frequency: 'daily' | 'weekly' | 'monthly'): Promise<void> => {
  try {
    await axios.post('/api/admin/ledger/schedule-export', {
      format,
      email,
      frequency
    });
  } catch (error) {
    console.error("Error scheduling export:", error);
    throw error;
  }
};

// CRUD operations for ledger entries
const createLedgerEntry = async (entry: Omit<LedgerEntry, "id" | "balance">): Promise<LedgerEntry> => {
  try {
    // Convert our interface to API format
    const apiEntry = {
      date: entry.date,
      description: entry.description,
      amount: entry.amount,
      type: entry.type,
      category: entry.category,
      payment_method: entry.paymentMethod,
      reference: entry.reference,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      status: entry.status,
      notes: entry.notes
    };
    
    const response = await axios.post('/api/admin/ledger.php', apiEntry);
    
    // Convert API response back to our interface
    const newEntry = response.data.data;
    return {
      id: newEntry.id,
      date: newEntry.date,
      description: newEntry.description,
      type: newEntry.type,
      amount: Number(newEntry.amount),
      category: newEntry.category,
      paymentMethod: newEntry.payment_method,
      reference: newEntry.reference,
      balance: Number(newEntry.balance),
      status: newEntry.status,
      entityId: newEntry.entity_id,
      entityType: newEntry.entity_type,
      notes: newEntry.notes
    };
  } catch (error) {
    console.error("Error creating ledger entry:", error);
    throw error;
  }
};

const updateLedgerEntry = async (id: string | number, entry: Partial<LedgerEntry>): Promise<LedgerEntry> => {
  try {
    // Convert our interface to API format
    const apiEntry: Record<string, any> = {};
    
    if (entry.date) apiEntry.date = entry.date;
    if (entry.description) apiEntry.description = entry.description;
    if (entry.amount !== undefined) apiEntry.amount = entry.amount;
    if (entry.type) apiEntry.type = entry.type;
    if (entry.category) apiEntry.category = entry.category;
    if (entry.paymentMethod) apiEntry.payment_method = entry.paymentMethod;
    if (entry.reference !== undefined) apiEntry.reference = entry.reference;
    if (entry.entityType) apiEntry.entity_type = entry.entityType;
    if (entry.entityId) apiEntry.entity_id = entry.entityId;
    if (entry.status) apiEntry.status = entry.status;
    if (entry.notes !== undefined) apiEntry.notes = entry.notes;
    
    const response = await axios.put(`/api/admin/ledger.php?id=${id}`, apiEntry);
    
    // Convert API response back to our interface
    const updatedEntry = response.data.data;
    return {
      id: updatedEntry.id,
      date: updatedEntry.date,
      description: updatedEntry.description,
      type: updatedEntry.type,
      amount: Number(updatedEntry.amount),
      category: updatedEntry.category,
      paymentMethod: updatedEntry.payment_method,
      reference: updatedEntry.reference,
      balance: Number(updatedEntry.balance),
      status: updatedEntry.status,
      entityId: updatedEntry.entity_id,
      entityType: updatedEntry.entity_type,
      notes: updatedEntry.notes
    };
  } catch (error) {
    console.error("Error updating ledger entry:", error);
    throw error;
  }
};

const deleteLedgerEntry = async (id: string | number): Promise<void> => {
  try {
    await axios.delete(`/api/admin/ledger.php?id=${id}`);
  } catch (error) {
    console.error("Error deleting ledger entry:", error);
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
  scheduleExport,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry
};
