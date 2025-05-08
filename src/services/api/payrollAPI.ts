
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths, getMonth, getYear, parseISO, isWithinInterval } from "date-fns";
import { 
  AttendanceRecord, 
  DriverPaySummary, 
  PayrollEntry, 
  PayrollFilter, 
  PayrollSummary, 
  SalaryComponent 
} from "@/types/ledger";

// Default salary components for drivers
const DEFAULT_SALARY_COMPONENTS: SalaryComponent[] = [
  { id: 'basic', name: 'Basic Salary', type: 'basic', amount: 15000, isFixed: true },
  { id: 'batha', name: 'Daily Allowance (Batha)', type: 'allowance', amount: 200, isFixed: false, calculationMethod: 'perDay' },
  { id: 'fuel', name: 'Fuel Allowance', type: 'allowance', amount: 3000, isFixed: true },
  { id: 'mobile', name: 'Mobile Allowance', type: 'allowance', amount: 500, isFixed: true },
  { id: 'trip-bonus', name: 'Trip Bonus', type: 'bonus', amount: 0, isFixed: false, calculationMethod: 'perTrip' },
  { id: 'pf', name: 'Provident Fund', type: 'deduction', amount: 0, isFixed: false, calculationMethod: 'percentage', calculationBase: 'basic', calculationValue: 12 },
  { id: 'advance', name: 'Salary Advance', type: 'advance', amount: 0, isFixed: false },
];

/**
 * Fetch salary components for payroll calculations
 */
const fetchSalaryComponents = async (): Promise<SalaryComponent[]> => {
  try {
    // In a real implementation, this would call an API
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // For now, return the default components
    return DEFAULT_SALARY_COMPONENTS;
  } catch (error) {
    console.error("Error fetching salary components:", error);
    toast.error("Failed to fetch salary components");
    return DEFAULT_SALARY_COMPONENTS;
  }
};

/**
 * Add or update a salary component
 */
const updateSalaryComponent = async (component: SalaryComponent): Promise<SalaryComponent> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success(`Salary component "${component.name}" updated successfully`);
    return component;
  } catch (error) {
    console.error("Error updating salary component:", error);
    toast.error("Failed to update salary component");
    throw error;
  }
};

/**
 * Fetch attendance records for a driver or all drivers
 */
const fetchAttendanceRecords = async (
  driverId?: string | number,
  dateRange?: DateRange
): Promise<AttendanceRecord[]> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Generate mock attendance data
    return generateMockAttendance(driverId, dateRange);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    toast.error("Failed to fetch attendance records");
    return [];
  }
};

/**
 * Add or update attendance record
 */
const updateAttendanceRecord = async (record: AttendanceRecord): Promise<AttendanceRecord> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    toast.success("Attendance record updated");
    return record;
  } catch (error) {
    console.error("Error updating attendance record:", error);
    toast.error("Failed to update attendance record");
    throw error;
  }
};

/**
 * Fetch payroll entries with optional filters
 */
const fetchPayrollEntries = async (filters?: PayrollFilter): Promise<PayrollEntry[]> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Generate mock payroll data with consideration for filters
    const payrollEntries = generateMockPayrollEntries();
    
    // Apply filters if provided
    let filteredEntries = [...payrollEntries];
    
    if (filters) {
      // Filter by date range
      if (filters.dateRange) {
        filteredEntries = filteredEntries.filter(entry => {
          const startDate = parseISO(entry.payPeriod.startDate);
          const endDate = parseISO(entry.payPeriod.endDate);
          
          if (filters.dateRange?.from && 
              isWithinInterval(filters.dateRange.from, {
                start: startDate,
                end: endDate
              })) {
            return true;
          }
          
          if (filters.dateRange?.to && 
              isWithinInterval(filters.dateRange.to, {
                start: startDate,
                end: endDate
              })) {
            return true;
          }
          
          return false;
        });
      }
      
      // Filter by driver id
      if (filters.driverId) {
        filteredEntries = filteredEntries.filter(entry => 
          entry.driverId === filters.driverId);
      }
      
      // Filter by payment status
      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        filteredEntries = filteredEntries.filter(entry => 
          entry.paymentStatus === filters.paymentStatus);
      }
      
      // Filter by pay period (month and year)
      if (filters.payPeriod) {
        filteredEntries = filteredEntries.filter(entry => {
          const startDate = parseISO(entry.payPeriod.startDate);
          return (
            getMonth(startDate) + 1 === filters.payPeriod!.month && 
            getYear(startDate) === filters.payPeriod!.year
          );
        });
      }
    }
    
    return filteredEntries;
  } catch (error) {
    console.error("Error fetching payroll entries:", error);
    toast.error("Failed to fetch payroll data");
    return [];
  }
};

/**
 * Create a new payroll entry
 */
const createPayrollEntry = async (payrollData: Omit<PayrollEntry, 'id' | 'created_at' | 'updated_at'>): Promise<PayrollEntry> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // In a real app, the ID would be generated on the server
    const newEntry: PayrollEntry = {
      ...payrollData,
      id: `pay-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    toast.success("Payroll entry created successfully");
    return newEntry;
  } catch (error) {
    console.error("Error creating payroll entry:", error);
    toast.error("Failed to create payroll entry");
    throw error;
  }
};

/**
 * Update an existing payroll entry
 */
const updatePayrollEntry = async (id: string | number, payrollData: Partial<PayrollEntry>): Promise<PayrollEntry> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success("Payroll entry updated successfully");
    
    // In a real app, the updated entry would come from the server
    return {
      ...payrollData,
      id,
      updated_at: new Date().toISOString(),
    } as PayrollEntry;
  } catch (error) {
    console.error("Error updating payroll entry:", error);
    toast.error("Failed to update payroll entry");
    throw error;
  }
};

/**
 * Get driver's pay summary with attendance, advances, etc.
 */
const getDriverPaySummary = async (driverId: string | number, month?: number, year?: number): Promise<DriverPaySummary> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Get current month/year if not provided
    const currentDate = new Date();
    const targetMonth = month !== undefined ? month : getMonth(currentDate) + 1;
    const targetYear = year !== undefined ? year : getYear(currentDate);
    
    // Generate mock data for the driver
    const driverName = `Driver ${driverId}`;
    const basicSalary = 15000;
    const allowances = 5000;
    const deductions = 2000;
    const advances = 1500;
    
    // Mock attendance summary
    const attendanceSummary = {
      daysPresent: 22,
      daysAbsent: 3,
      paidLeaves: 2,
      unpaidLeaves: 1,
    };
    
    // Mock previous payments
    const previousPayments = [];
    for (let i = 1; i <= 3; i++) {
      const prevMonth = (targetMonth - i) > 0 ? (targetMonth - i) : (12 + targetMonth - i);
      const prevYear = prevMonth > targetMonth ? targetYear - 1 : targetYear;
      
      previousPayments.push({
        month: format(new Date(prevYear, prevMonth - 1, 1), 'MMM yyyy'),
        amount: 15000 + Math.floor(Math.random() * 5000),
        paymentDate: format(new Date(prevYear, prevMonth - 1, 25), 'yyyy-MM-dd'),
      });
    }
    
    return {
      driverId,
      driverName,
      basicSalary,
      totalEarnings: basicSalary + allowances,
      totalDeductions: deductions,
      totalAdvances: advances,
      pendingAmount: basicSalary + allowances - deductions - advances,
      attendanceSummary,
      previousPayments,
    };
  } catch (error) {
    console.error("Error fetching driver pay summary:", error);
    toast.error("Failed to fetch driver's pay summary");
    throw error;
  }
};

/**
 * Record salary advance for a driver
 */
const recordSalaryAdvance = async (
  driverId: string | number, 
  amount: number, 
  date: string,
  notes?: string
): Promise<void> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    toast.success(`Salary advance of ₹${amount} recorded for Driver ${driverId}`);
  } catch (error) {
    console.error("Error recording salary advance:", error);
    toast.error("Failed to record salary advance");
    throw error;
  }
};

/**
 * Get payroll summary for reporting
 */
const getPayrollSummary = async (dateRange?: DateRange): Promise<PayrollSummary> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock payroll summary data
    const drivers = [
      { id: 1, name: 'Rajesh Kumar' },
      { id: 2, name: 'Suresh Singh' },
      { id: 3, name: 'Mahesh Reddy' },
    ];
    
    // Generate by driver summary
    const byDriver = drivers.map(driver => ({
      driverId: driver.id,
      driverName: driver.name,
      amount: 15000 + Math.floor(Math.random() * 8000),
      status: ['pending', 'partial', 'paid'][Math.floor(Math.random() * 3)] as 'pending' | 'partial' | 'paid',
    }));
    
    // Calculate totals
    const totalPaid = byDriver
      .filter(d => d.status === 'paid')
      .reduce((sum, d) => sum + d.amount, 0);
      
    const totalPending = byDriver
      .filter(d => d.status !== 'paid')
      .reduce((sum, d) => sum + d.amount, 0);
    
    // Generate monthly data
    const byMonth = [];
    for (let i = 0; i < 6; i++) {
      const date = subMonths(new Date(), i);
      byMonth.push({
        month: format(date, 'MMM yyyy'),
        amount: 40000 + Math.floor(Math.random() * 20000),
      });
    }
    
    // Sort by month (most recent first)
    byMonth.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
    
    return {
      totalPaid,
      totalPending,
      totalDrivers: drivers.length,
      byDriver,
      byMonth,
    };
  } catch (error) {
    console.error("Error getting payroll summary:", error);
    toast.error("Failed to generate payroll summary");
    return {
      totalPaid: 0,
      totalPending: 0,
      totalDrivers: 0,
      byDriver: [],
      byMonth: [],
    };
  }
};

/**
 * Generate a payslip for a driver
 */
const generatePayslip = async (payrollId: string | number, format: 'pdf' | 'excel'): Promise<string> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast.success(`Payslip generated in ${format.toUpperCase()} format`);
    return `payslip_${payrollId}.${format}`;
  } catch (error) {
    console.error("Error generating payslip:", error);
    toast.error("Failed to generate payslip");
    throw error;
  }
};

/**
 * Helper function to generate mock attendance data
 */
function generateMockAttendance(driverId?: string | number, dateRange?: DateRange): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  
  // Default to current month if no date range specified
  const startDate = dateRange?.from || startOfMonth(new Date());
  const endDate = dateRange?.to || endOfMonth(new Date());
  
  // Generate date range
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // Skip if we're looking for a specific driver and this isn't it
    if (driverId) {
      records.push(generateAttendanceForDay(driverId, new Date(currentDate)));
    } else {
      // Generate for all three mock drivers
      for (let i = 1; i <= 3; i++) {
        records.push(generateAttendanceForDay(`DRV00${i}`, new Date(currentDate)));
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return records;
}

/**
 * Generate attendance for a specific day
 */
function generateAttendanceForDay(driverId: string | number, date: Date): AttendanceRecord {
  // Weekend check
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Generate random status
  let status: AttendanceRecord['status'];
  let hoursWorked = 0;
  let overtimeHours = 0;
  
  if (isWeekend) {
    // Weekend - either holiday or someone still worked
    status = Math.random() > 0.7 ? 'present' : 'holiday';
  } else {
    // Weekday - mostly present with some exceptions
    const rand = Math.random();
    if (rand > 0.9) status = 'absent';
    else if (rand > 0.85) status = 'half-day';
    else if (rand > 0.8) status = 'paid-leave';
    else if (rand > 0.75) status = 'unpaid-leave';
    else status = 'present';
  }
  
  // Set hours based on status
  if (status === 'present') {
    hoursWorked = 8;
    // 30% chance of overtime
    if (Math.random() > 0.7) {
      overtimeHours = Math.floor(Math.random() * 4) + 1;
    }
  } else if (status === 'half-day') {
    hoursWorked = 4;
  }
  
  return {
    id: `att-${driverId}-${format(date, 'yyyyMMdd')}`,
    driverId,
    date: format(date, 'yyyy-MM-dd'),
    status,
    hoursWorked,
    overtimeHours,
    notes: status !== 'present' && status !== 'holiday' ? 
      getRandomNote(status) : undefined
  };
}

/**
 * Generate a random note for attendance records
 */
function getRandomNote(status: string): string {
  const absentReasons = [
    "Personal emergency",
    "Medical issue",
    "Family function",
    "Vehicle breakdown",
    "Transportation issues"
  ];
  
  const leaveReasons = [
    "Annual leave",
    "Medical leave",
    "Family event",
    "Religious festival",
    "Personal time"
  ];
  
  if (status === 'absent' || status === 'unpaid-leave') {
    return absentReasons[Math.floor(Math.random() * absentReasons.length)];
  } else {
    return leaveReasons[Math.floor(Math.random() * leaveReasons.length)];
  }
}

/**
 * Helper function to generate mock payroll entries
 */
function generateMockPayrollEntries(): PayrollEntry[] {
  const entries: PayrollEntry[] = [];
  const drivers = [
    { id: 'DRV001', name: 'Rajesh Kumar' },
    { id: 'DRV002', name: 'Suresh Singh' },
    { id: 'DRV003', name: 'Mahesh Reddy' },
  ];
  
  // Generate entries for the last 3 months for each driver
  for (let i = 0; i < 3; i++) {
    const month = subMonths(new Date(), i);
    const payPeriodStart = startOfMonth(month);
    const payPeriodEnd = endOfMonth(month);
    
    for (const driver of drivers) {
      // Base salary
      const basicSalary = 15000;
      
      // Random allowances
      const allowances = [
        { type: 'batha', amount: Math.floor(Math.random() * 10 + 20) * 200 }, // Daily allowance for ~20-30 days
        { type: 'fuel', amount: 3000 },
        { type: 'mobile', amount: 500 },
      ];
      
      if (Math.random() > 0.7) {
        allowances.push({ type: 'trip-bonus', amount: Math.floor(Math.random() * 8 + 2) * 500 }); // 2-10 trips with 500 bonus each
      }
      
      // Random deductions
      const deductions = [
        { type: 'pf', amount: Math.round(basicSalary * 0.12) },
      ];
      
      if (Math.random() > 0.8) {
        deductions.push({ type: 'damage', amount: Math.floor(Math.random() * 2000) + 500 });
      }
      
      // Random advances
      const advances = [];
      if (Math.random() > 0.7) {
        advances.push({
          date: format(new Date(payPeriodStart.getFullYear(), payPeriodStart.getMonth(), 10), 'yyyy-MM-dd'),
          amount: Math.floor(Math.random() * 3000) + 2000,
          notes: "Mid-month advance"
        });
      }
      
      // Calculate days worked and leave
      const daysWorked = Math.floor(Math.random() * 8) + 20; // 20-28 days worked
      const daysLeave = 30 - daysWorked;
      
      // Calculate net salary
      const totalAllowances = allowances.reduce((sum, item) => sum + item.amount, 0);
      const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
      const totalAdvances = advances.reduce((sum, item) => sum + item.amount, 0);
      const netSalary = basicSalary + totalAllowances - totalDeductions - totalAdvances;
      
      // Determine payment status based on how recent the month is
      let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
      let paymentDate: string | undefined = undefined;
      
      // Older entries are more likely to be paid
      if (i === 0) {
        paymentStatus = Math.random() > 0.7 ? 'pending' : 'partial';
      } else if (i === 1) {
        paymentStatus = Math.random() > 0.3 ? 'paid' : 'partial';
        if (paymentStatus === 'paid') {
          const payDate = new Date(payPeriodEnd);
          payDate.setDate(payDate.getDate() + 5);
          paymentDate = format(payDate, 'yyyy-MM-dd');
        }
      } else {
        paymentStatus = 'paid';
        const payDate = new Date(payPeriodEnd);
        payDate.setDate(payDate.getDate() + 5);
        paymentDate = format(payDate, 'yyyy-MM-dd');
      }
      
      // Create the entry
      entries.push({
        id: `pay-${driver.id}-${format(payPeriodStart, 'yyyyMM')}`,
        driverId: driver.id,
        date: format(payPeriodEnd, 'yyyy-MM-dd'), // Use month end as date
        description: `Salary for ${format(payPeriodStart, 'MMM yyyy')} - ${driver.name}`,
        amount: netSalary,
        type: 'expense',
        category: 'Salary',
        paymentMethod: 'Bank Transfer',
        status: paymentStatus === 'paid' ? 'reconciled' : 'pending',
        payPeriod: {
          startDate: format(payPeriodStart, 'yyyy-MM-dd'),
          endDate: format(payPeriodEnd, 'yyyy-MM-dd'),
        },
        basicSalary,
        allowances,
        deductions,
        advances,
        daysWorked,
        daysLeave,
        overtimeHours: Math.random() > 0.6 ? Math.floor(Math.random() * 20) + 5 : 0,
        netSalary,
        paymentStatus,
        paymentDate,
        payslipIssued: paymentStatus === 'paid',
        created_at: format(new Date(payPeriodEnd.getFullYear(), payPeriodEnd.getMonth(), payPeriodEnd.getDate() + 1), 'yyyy-MM-dd'),
        updated_at: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }
  
  // Sort entries by date (most recent first)
  return entries.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export const payrollAPI = {
  fetchSalaryComponents,
  updateSalaryComponent,
  fetchAttendanceRecords,
  updateAttendanceRecord,
  fetchPayrollEntries,
  createPayrollEntry,
  updatePayrollEntry,
  getDriverPaySummary,
  recordSalaryAdvance,
  getPayrollSummary,
  generatePayslip,
};
