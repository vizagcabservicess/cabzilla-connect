
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import axios from "axios";
import { 
  AttendanceRecord, 
  DriverPaySummary, 
  PayrollEntry, 
  PayrollFilter, 
  PayrollSummary, 
  SalaryComponent 
} from "@/types/ledger";

// API base URL - use a relative path to ensure it works in all environments
const API_BASE_URL = '/api/admin';

// Error handler function
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
 * Fetch salary components for payroll calculations
 */
const fetchSalaryComponents = async (): Promise<SalaryComponent[]> => {
  try {
    console.log("Fetching salary components...");
    
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    const response = await axios.get(`${API_BASE_URL}/payroll.php`, {
      params: {
        action: 'salary_components',
        _t: timestamp
      },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    if (response.data.status === 'success') {
      console.log("Salary components fetched successfully:", response.data.data);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to fetch salary components';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      return [];
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to fetch salary components");
    toast.error(errorMsg);
    console.error("Error details:", error);
    return [];
  }
};

/**
 * Add or update a salary component
 */
const updateSalaryComponent = async (component: SalaryComponent): Promise<SalaryComponent> => {
  try {
    console.log("Updating salary component:", component);
    
    // Determine if this is a new component (no ID) or updating existing
    const isNewComponent = !component.id || component.id === 0;
    const method = isNewComponent ? 'POST' : 'PUT';
    const action = isNewComponent ? 'salary_component' : 'salary_component';
    
    const response = await axios({
      method,
      url: `${API_BASE_URL}/payroll.php`,
      data: {
        ...component,
        action
      }
    });
    
    if (response.data.status === 'success') {
      const successMsg = isNewComponent 
        ? `Salary component "${component.name}" added successfully` 
        : `Salary component "${component.name}" updated successfully`;
      toast.success(successMsg);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to update salary component';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to update salary component");
    toast.error(errorMsg);
    console.error("Error details:", error);
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
    console.log("Fetching attendance records for driver:", driverId);
    
    // Build query parameters
    const params: Record<string, any> = {
      _t: new Date().getTime(),
    };
    
    if (driverId) {
      params.driver_id = driverId;
    }
    
    if (dateRange) {
      Object.assign(params, prepareDateRangeParams(dateRange));
    }
    
    const response = await axios.get(`${API_BASE_URL}/attendance.php`, {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    if (response.data.status === 'success') {
      console.log("Attendance records fetched successfully:", response.data.data);
      return response.data.data || [];
    } else {
      const errorMsg = response.data.message || 'Failed to fetch attendance records';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      return [];
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to fetch attendance records");
    toast.error(errorMsg);
    console.error("Error details:", error);
    return [];
  }
};

/**
 * Add or update attendance record
 */
const updateAttendanceRecord = async (record: AttendanceRecord): Promise<AttendanceRecord> => {
  try {
    console.log("Updating attendance record:", record);
    
    // Determine if this is a new record (no ID) or updating existing
    const isNewRecord = !record.id || record.id === '';
    const method = isNewRecord ? 'POST' : 'PUT';
    
    const response = await axios({
      method,
      url: `${API_BASE_URL}/attendance.php`,
      data: record
    });
    
    if (response.data.status === 'success') {
      const successMsg = isNewRecord 
        ? "Attendance record created successfully" 
        : "Attendance record updated successfully";
      toast.success(successMsg);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to update attendance record';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to update attendance record");
    toast.error(errorMsg);
    console.error("Error details:", error);
    throw error;
  }
};

/**
 * Fetch payroll entries with optional filters
 */
const fetchPayrollEntries = async (filters?: PayrollFilter): Promise<PayrollEntry[]> => {
  try {
    console.log("Fetching payroll entries with filters:", filters);
    let params: Record<string, any> = {
      _t: new Date().getTime(), // Add timestamp to prevent caching
    };
    
    if (filters) {
      // Add date range parameters
      if (filters.dateRange) {
        Object.assign(params, prepareDateRangeParams(filters.dateRange));
      }
      
      // Add driver ID filter
      if (filters.driverId) {
        params.driver_id = filters.driverId;
      }
      
      // Add payment status filter
      if (filters.paymentStatus) {
        params.payment_status = filters.paymentStatus;
      }
      
      // Add pay period filter
      if (filters.payPeriod) {
        const { month, year } = filters.payPeriod;
        const fromDate = new Date(year, month - 1, 1);
        const toDate = new Date(year, month, 0); // Last day of month
        params.from_date = format(fromDate, 'yyyy-MM-dd');
        params.to_date = format(toDate, 'yyyy-MM-dd');
      }
    }
    
    const response = await axios.get(`${API_BASE_URL}/payroll.php`, {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    if (response.data.status === 'success') {
      console.log("Payroll entries fetched successfully:", response.data.data);
      return response.data.data || [];
    } else {
      const errorMsg = response.data.message || 'Failed to fetch payroll entries';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      return [];
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to fetch payroll entries");
    toast.error(errorMsg);
    console.error("Error details:", error);
    return [];
  }
};

/**
 * Create a new payroll entry
 */
const createPayrollEntry = async (payrollData: Omit<PayrollEntry, 'id' | 'created_at' | 'updated_at'>): Promise<PayrollEntry> => {
  try {
    console.log("Creating payroll entry:", payrollData);
    
    // Format any date fields
    const formattedPayrollData = {
      ...payrollData,
      action: 'add_payroll'
    };
    
    const response = await axios.post(`${API_BASE_URL}/payroll.php`, formattedPayrollData);
    
    if (response.data.status === 'success') {
      toast.success("Payroll entry created successfully");
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to create payroll entry';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to create payroll entry");
    toast.error(errorMsg);
    console.error("Error details:", error);
    throw error;
  }
};

/**
 * Update an existing payroll entry
 */
const updatePayrollEntry = async (id: string | number, payrollData: Partial<PayrollEntry>): Promise<PayrollEntry> => {
  try {
    console.log("Updating payroll entry:", id, payrollData);
    
    // Format dates if needed and include ID
    const formattedPayrollData = {
      ...payrollData,
      id
    };
    
    const response = await axios.put(`${API_BASE_URL}/payroll.php`, formattedPayrollData);
    
    if (response.data.status === 'success') {
      toast.success("Payroll entry updated successfully");
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to update payroll entry';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to update payroll entry");
    toast.error(errorMsg);
    console.error("Error details:", error);
    throw error;
  }
};

/**
 * Get driver's pay summary with attendance, advances, etc.
 */
const getDriverPaySummary = async (driverId: string | number, month?: number, year?: number): Promise<DriverPaySummary> => {
  try {
    console.log("Getting driver pay summary:", driverId, month, year);
    
    const params: Record<string, any> = {
      driver_id: driverId,
      _t: new Date().getTime(),
    };
    
    if (month !== undefined) {
      params.month = month;
    }
    
    if (year !== undefined) {
      params.year = year;
    }
    
    const response = await axios.get(`${API_BASE_URL}/payroll.php`, {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    if (response.data.status === 'success') {
      console.log("Driver pay summary fetched successfully:", response.data.data);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to fetch driver pay summary';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to fetch driver pay summary");
    toast.error(errorMsg);
    console.error("Error details:", error);
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
    console.log("Recording salary advance:", driverId, amount, date);
    
    const response = await axios.post(`${API_BASE_URL}/payroll.php`, {
      action: 'advance',
      driverId,
      amount,
      date,
      notes
    });
    
    if (response.data.status === 'success') {
      toast.success(`Salary advance of ₹${amount} recorded for driver`);
    } else {
      const errorMsg = response.data.message || 'Failed to record salary advance';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to record salary advance");
    toast.error(errorMsg);
    console.error("Error details:", error);
    throw error;
  }
};

/**
 * Get payroll summary for reporting
 */
const getPayrollSummary = async (dateRange?: DateRange): Promise<PayrollSummary> => {
  try {
    console.log("Getting payroll summary with dateRange:", dateRange);
    
    const params: Record<string, any> = {
      action: 'summary',
      _t: new Date().getTime(),
      ...prepareDateRangeParams(dateRange)
    };
    
    const response = await axios.get(`${API_BASE_URL}/payroll.php`, {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    if (response.data.status === 'success') {
      console.log("Payroll summary fetched successfully:", response.data.data);
      return response.data.data;
    } else {
      const errorMsg = response.data.message || 'Failed to generate payroll summary';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      
      // Return empty summary on error
      return {
        totalPaid: 0,
        totalPending: 0,
        totalDrivers: 0,
        byDriver: [],
        byMonth: [],
      };
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to generate payroll summary");
    toast.error(errorMsg);
    console.error("Error details:", error);
    
    // Return empty summary on error
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
    console.log("Generating payslip:", payrollId, format);
    
    const response = await axios.get(`${API_BASE_URL}/payroll.php`, {
      params: {
        action: 'payslip',
        id: payrollId,
        format
      }
    });
    
    if (response.data.status === 'success') {
      toast.success(`Payslip generated in ${format.toUpperCase()} format`);
      return response.data.data.url;
    } else {
      const errorMsg = response.data.message || 'Failed to generate payslip';
      console.error("API returned error:", errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    const errorMsg = handleApiError(error, "Failed to generate payslip");
    toast.error(errorMsg);
    console.error("Error details:", error);
    throw error;
  }
};

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
