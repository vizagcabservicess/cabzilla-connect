import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { 
  ApiResponse,
  ApiErrorResponse,
  ReportFilterParams,
  ReportData,
  BookingsReportData,
  RevenueReportData,
  DriversReportData,
  VehiclesReportData,
  GstReportData,
  NonGstReportData,
  MaintenanceReportData,
  LedgerReportData,
  FuelsReportData
} from '@/types/reports';
import { apiBaseUrl } from '@/config/api';

/** Same window as the main report: preset periods use only `period`; custom sends explicit dates. */
export function buildReportDrillRange(
  periodFilter: string | undefined,
  dateRange: DateRange | undefined
): { period: string; startDate?: string; endDate?: string } {
  const pf = (periodFilter || 'custom').trim() || 'custom';
  if (pf === 'custom') {
    const from = dateRange?.from ?? new Date(new Date().setDate(new Date().getDate() - 30));
    const to = dateRange?.to ?? new Date();
    return {
      period: 'custom',
      startDate: format(from, 'yyyy-MM-dd'),
      endDate: format(to, 'yyyy-MM-dd'),
    };
  }
  return { period: pf };
}

/**
 * Fetch report data from the API
 */
export async function fetchReport<T extends ReportData>(params: ReportFilterParams): Promise<T> {
  try {
    const { 
      reportType, 
      dateRange, 
      periodFilter = 'custom',
      withGst = false,
      paymentMethod = '',
      onlyGstEnabled = false,
      vehicleId = '',
      driverId = '',
      serviceType = '',
      tripStatus = '',
      paymentStatus = ''
    } = params;
    
    // Build API parameters object
    let apiParams: Record<string, string> = {
      type: reportType,
      period: periodFilter
    };
    
    // Only include date range if period is 'custom'
    if (periodFilter === 'custom' && dateRange) {
      const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd');
      const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      apiParams.start_date = startDate;
      apiParams.end_date = endDate;
    }
    
    // Add optional parameters
    if (withGst) {
      apiParams.gst = 'true';
    }
    
    if (paymentMethod) {
      apiParams.payment_method = paymentMethod;
    }
    
    // GST-customer filter (revenue etc.) — never send for Non-GST report type
    if (reportType === 'gst') {
      apiParams.only_gst_enabled = 'true';
    } else if (onlyGstEnabled && reportType !== 'nongst') {
      apiParams.only_gst_enabled = 'true';
    }
    
    // Profit dashboard filters
    if (reportType === 'profit') {
      if (vehicleId) apiParams.vehicle_id = vehicleId;
      if (driverId) apiParams.driver_id = driverId;
      if (serviceType) apiParams.service_type = serviceType;
    }
    // Vehicles report filter
    if (reportType === 'vehicles' && vehicleId) {
      apiParams.vehicle_id = vehicleId;
    }

    const ts = (tripStatus || '').trim().toLowerCase();
    const ps = (paymentStatus || '').trim().toLowerCase();
    if (ts && ts !== 'all') {
      apiParams.trip_status = ts;
    }
    if (ps && ps !== 'all') {
      apiParams.payment_status = ps;
    }
    
    // Convert parameters to query string
    const queryString = Object.entries(apiParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Build full URL
    const url = `${apiBaseUrl}/api/admin/reports.php?${queryString}`;
    
    console.log('Fetching report data from:', url);
    
    // Make the API request
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true',
        'X-Debug': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}`);
    }
    
    const apiResponse = await response.json() as ApiResponse<T>;
    
    if (apiResponse.status === 'success') {
      console.log('Report data received:', apiResponse.data);
      return apiResponse.data;
    } else {
      throw new Error((apiResponse as ApiErrorResponse).message || 'Failed to retrieve report data');
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    throw error;
  }
}

/**
 * Fetch bookings for a specific date (drill-down from bookings report)
 */
export async function fetchBookingsByDate(
  date: string,
  filters?: { tripStatus?: string; paymentStatus?: string }
): Promise<Record<string, unknown>[]> {
  try {
    const params = new URLSearchParams({ type: 'bookings', date });
    const ts = (filters?.tripStatus || '').trim().toLowerCase();
    const ps = (filters?.paymentStatus || '').trim().toLowerCase();
    if (ts && ts !== 'all') params.set('trip_status', ts);
    if (ps && ps !== 'all') params.set('payment_status', ps);
    const url = `${apiBaseUrl}/api/admin/reports.php?${params}`;
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache', 'X-Force-Refresh': 'true' }
    });
    if (!response.ok) throw new Error(`Failed to fetch bookings: ${response.status}`);
    const json = await response.json() as { status: string; data?: Record<string, unknown>[] };
    if (json.status === 'success' && Array.isArray(json.data)) return json.data;
    return [];
  } catch (error) {
    console.error('Error fetching bookings by date:', error);
    throw error;
  }
}

/**
 * Fetch bookings for a specific vehicle and date range (Vehicles report trip drill-down)
 */
export async function fetchBookingsByVehicle(
  vehicleId: string,
  range: { period: string; startDate?: string; endDate?: string },
  filters?: { tripStatus?: string; paymentStatus?: string }
): Promise<Record<string, unknown>[]> {
  try {
    const params = new URLSearchParams({
      type: 'bookings',
      vehicle_id: vehicleId,
      period: range.period,
    });
    if (range.period === 'custom') {
      if (range.startDate) params.set('start_date', range.startDate);
      if (range.endDate) params.set('end_date', range.endDate);
    }
    const ts = (filters?.tripStatus || '').trim().toLowerCase();
    const ps = (filters?.paymentStatus || '').trim().toLowerCase();
    if (ts && ts !== 'all') params.set('trip_status', ts);
    if (ps && ps !== 'all') params.set('payment_status', ps);
    const url = `${apiBaseUrl}/api/admin/reports.php?${params}`;
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache', 'X-Force-Refresh': 'true' }
    });
    if (!response.ok) throw new Error(`Failed to fetch vehicle bookings: ${response.status}`);
    const json = await response.json() as { status: string; data?: Record<string, unknown>[] };
    if (json.status === 'success' && Array.isArray(json.data)) return json.data;
    return [];
  } catch (error) {
    console.error('Error fetching bookings by vehicle:', error);
    throw error;
  }
}

/**
 * Bookings for a driver + period (Drivers report drill-down)
 */
export async function fetchBookingsByDriver(
  driverId: string,
  range: { period: string; startDate?: string; endDate?: string },
  filters?: { tripStatus?: string; paymentStatus?: string }
): Promise<Record<string, unknown>[]> {
  try {
    const params = new URLSearchParams({
      type: 'bookings',
      driver_id: driverId,
      period: range.period,
    });
    if (range.period === 'custom') {
      if (range.startDate) params.set('start_date', range.startDate);
      if (range.endDate) params.set('end_date', range.endDate);
    }
    const ts = (filters?.tripStatus || '').trim().toLowerCase();
    const ps = (filters?.paymentStatus || '').trim().toLowerCase();
    if (ts && ts !== 'all') params.set('trip_status', ts);
    if (ps && ps !== 'all') params.set('payment_status', ps);
    const url = `${apiBaseUrl}/api/admin/reports.php?${params}`;
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache', 'X-Force-Refresh': 'true' }
    });
    if (!response.ok) throw new Error(`Failed to fetch driver bookings: ${response.status}`);
    const json = await response.json() as { status: string; data?: Record<string, unknown>[] };
    if (json.status === 'success' && Array.isArray(json.data)) return json.data;
    return [];
  } catch (error) {
    console.error('Error fetching bookings by driver:', error);
    throw error;
  }
}

/**
 * Fetch bookings report
 */
export async function fetchBookingsReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<BookingsReportData> {
  return fetchReport<BookingsReportData>({
    ...params,
    reportType: 'bookings'
  });
}

/**
 * Fetch revenue report
 */
export async function fetchRevenueReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<RevenueReportData> {
  return fetchReport<RevenueReportData>({
    ...params,
    reportType: 'revenue'
  });
}

/**
 * Fetch drivers report
 */
export async function fetchDriversReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<DriversReportData> {
  return fetchReport<DriversReportData>({
    ...params,
    reportType: 'drivers'
  });
}

/**
 * Fetch vehicles report
 */
export async function fetchVehiclesReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<VehiclesReportData> {
  return fetchReport<VehiclesReportData>({
    ...params,
    reportType: 'vehicles'
  });
}

/**
 * Fetch GST report
 */
export async function fetchGstReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<GstReportData> {
  return fetchReport<GstReportData>({
    ...params,
    reportType: 'gst',
    onlyGstEnabled: true // Always true for GST reports
  });
}

/**
 * Fetch Non-GST report
 */
export async function fetchNonGstReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<NonGstReportData> {
  return fetchReport<NonGstReportData>({
    ...params,
    reportType: 'nongst'
  });
}

/**
 * Fetch maintenance report
 */
export async function fetchMaintenanceReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<MaintenanceReportData> {
  return fetchReport<MaintenanceReportData>({
    ...params,
    reportType: 'maintenance'
  });
}

/**
 * Fetch ledger report
 */
export async function fetchLedgerReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<LedgerReportData> {
  return fetchReport<LedgerReportData>({
    ...params,
    reportType: 'ledger'
  });
}

/**
 * Fetch fuels report
 */
export async function fetchFuelsReport(params: Omit<ReportFilterParams, 'reportType'>): Promise<FuelsReportData> {
  return fetchReport<FuelsReportData>({
    ...params,
    reportType: 'fuels'
  });
}

/**
 * Export report data to CSV
 */
export function exportReportToCSV(reportType: string, data: any): void {
  try {
    let dataToExport: any[] = [];
    
    // Extract the correct data based on report type
    switch (reportType) {
      case 'bookings':
        dataToExport = data.dailyBookings || [];
        break;
      case 'revenue':
        dataToExport = data.dailyRevenue || [];
        break;
      case 'gst':
        dataToExport = data.gstInvoices || [];
        break;
      case 'drivers':
        dataToExport = data.drivers || [];
        break;
      case 'vehicles':
        dataToExport = data.vehicles || data.topVehicles || [];
        break;
      case 'nongst':
        dataToExport = data.bills || [];
        break;
      case 'maintenance':
        dataToExport = data.maintenance || [];
        break;
      case 'ledger':
        dataToExport = data.entries || [];
        break;
      case 'fuels':
        dataToExport = data.fuels || [];
        break;
      case 'profit':
        dataToExport = data.vehicleProfit?.length
          ? [...(data.vehicleProfit || []), ...(data.driverProfit || [])]
          : data.dailyChart || [];
        break;
      default:
        // If no specific structure, use the data as is
        dataToExport = Array.isArray(data) ? data : [data];
    }
    
    // If no data to export
    if (!dataToExport.length) {
      console.error('No data available to export');
      return;
    }
    
    // Get headers from the first object
    const headers = Object.keys(dataToExport[0]);
    
    // Create CSV content
    const csvRows = [
      headers.join(','), // Header row
      ...dataToExport.map(row => headers.map(header => {
        const value = row[header];
        // Handle different types of values
        if (value === null || value === undefined) return '""';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return `"${value}"`;
      }).join(','))
    ];
    
    // Join with newlines
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    
    console.log('CSV export completed');
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}
