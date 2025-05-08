
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

// Payroll specific types
export interface AttendanceRecord {
  id: string | number;
  driverId: string | number;
  date: string;
  status: 'present' | 'absent' | 'half-day' | 'paid-leave' | 'unpaid-leave' | 'holiday';
  hoursWorked?: number;
  overtimeHours?: number;
  notes?: string;
}

export interface SalaryComponent {
  id: string | number;
  name: string;
  type: 'basic' | 'allowance' | 'deduction' | 'advance' | 'bonus';
  amount: number;
  isFixed: boolean;
  calculationMethod?: 'fixed' | 'percentage' | 'perDay' | 'perTrip';
  calculationBase?: 'basic' | 'gross';
  calculationValue?: number;
  description?: string;
}

export interface PayrollEntry extends LedgerTransaction {
  driverId: string | number;
  payPeriod: {
    startDate: string;
    endDate: string;
  };
  basicSalary: number;
  allowances: {
    type: string;
    amount: number;
  }[];
  deductions: {
    type: string;
    amount: number;
  }[];
  advances: {
    date: string;
    amount: number;
    notes?: string;
  }[];
  daysWorked: number;
  daysLeave: number;
  overtimeHours?: number;
  tripBonus?: number;
  netSalary: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentDate?: string;
  payslipIssued: boolean;
}

export interface DriverPaySummary {
  driverId: string | number;
  driverName: string;
  basicSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  totalAdvances: number;
  pendingAmount: number;
  attendanceSummary: {
    daysPresent: number;
    daysAbsent: number;
    paidLeaves: number;
    unpaidLeaves: number;
  };
  previousPayments: {
    month: string;
    amount: number;
    paymentDate: string;
  }[];
}

export interface PayrollFilter extends Omit<LedgerFilter, "type" | "entity"> {
  driverId?: string | number;
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'all';
  payPeriod?: {
    month: number;
    year: number;
  };
}

export interface PayrollSummary {
  totalPaid: number;
  totalPending: number;
  totalDrivers: number;
  byDriver: {
    driverId: string | number;
    driverName: string;
    amount: number;
    status: 'pending' | 'partial' | 'paid';
  }[];
  byMonth: {
    month: string;
    amount: number;
  }[];
}
