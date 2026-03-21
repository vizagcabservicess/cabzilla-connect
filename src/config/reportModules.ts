/**
 * Dynamic report modules configuration — single source of truth for the web app.
 * The Expo app mirrors this in `mobile-app/src/config/reportModules.ts`. Update both when adding a module.
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
  { id: 'fuels', label: 'Fuels', apiType: 'fuels', iconWeb: 'Fuel', iconMobile: 'water-outline' },
  { id: 'profit', label: 'Profit', apiType: 'profit', iconWeb: 'TrendingUp', iconMobile: 'trending-up-outline' },
];
