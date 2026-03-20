/**
 * Dynamic report modules configuration - shared across web and mobile.
 * Add or remove modules here to update both platforms.
 */
export interface ReportModule {
  id: string;
  label: string;
  apiType: string;
  /** Lucide icon name for web; Ionicons name for mobile */
  iconWeb?: string;
  iconMobile?: string;
}

export const REPORT_MODULES: ReportModule[] = [
  { id: 'bookings', label: 'Bookings', apiType: 'bookings', iconWeb: 'CalendarCheck', iconMobile: 'calendar-outline' },
  { id: 'revenue', label: 'Revenue', apiType: 'revenue', iconWeb: 'FileText', iconMobile: 'cash-outline' },
  { id: 'drivers', label: 'Drivers', apiType: 'drivers', iconWeb: 'Car', iconMobile: 'people-outline' },
  { id: 'vehicles', label: 'Vehicles', apiType: 'vehicles', iconWeb: 'Car', iconMobile: 'car-outline' },
  { id: 'gst', label: 'GST', apiType: 'gst', iconWeb: 'Receipt', iconMobile: 'receipt-outline' },
  { id: 'nongst', label: 'Non-GST', apiType: 'nongst', iconWeb: 'Receipt', iconMobile: 'receipt-outline' },
  { id: 'maintenance', label: 'Maintenance', apiType: 'maintenance', iconWeb: 'Wrench', iconMobile: 'construct-outline' },
  { id: 'ledger', label: 'Ledger', apiType: 'ledger', iconWeb: 'BookOpen', iconMobile: 'book-outline' },
  { id: 'fuels', label: 'Fuels', apiType: 'fuels', iconWeb: 'Fuel', iconMobile: 'water-outline' },
  { id: 'profit', label: 'Profit', apiType: 'profit', iconWeb: 'TrendingUp', iconMobile: 'trending-up-outline' },
];
