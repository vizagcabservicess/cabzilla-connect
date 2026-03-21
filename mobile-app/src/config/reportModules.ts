/**
 * Keep in sync with repo root: src/config/reportModules.ts
 * Web + mobile use the same module ids and labels; mobile omits Ledger in the UI only.
 */
export interface ReportModule {
  id: string;
  label: string;
  apiType: string;
  iconWeb?: string;
  /** Ionicons name (outline variants), e.g. `receipt-outline` */
  iconMobile?: string;
}

export const REPORT_MODULES: ReportModule[] = [
  { id: 'bookings', label: 'Bookings', apiType: 'bookings', iconWeb: 'CalendarCheck', iconMobile: 'calendar-outline' },
  { id: 'revenue', label: 'Revenue', apiType: 'revenue', iconWeb: 'FileText', iconMobile: 'cash-outline' },
  { id: 'drivers', label: 'Drivers', apiType: 'drivers', iconWeb: 'Car', iconMobile: 'people-outline' },
  { id: 'vehicles', label: 'Vehicles', apiType: 'vehicles', iconWeb: 'Car', iconMobile: 'car-outline' },
  { id: 'gst', label: 'GST', apiType: 'gst', iconWeb: 'Receipt', iconMobile: 'receipt-outline' },
  { id: 'nongst', label: 'Non-GST', apiType: 'nongst', iconWeb: 'Receipt', iconMobile: 'document-text-outline' },
  { id: 'maintenance', label: 'Maintenance', apiType: 'maintenance', iconWeb: 'Wrench', iconMobile: 'construct-outline' },
  { id: 'fuels', label: 'Fuels', apiType: 'fuels', iconWeb: 'Fuel', iconMobile: 'water-outline' },
  { id: 'profit', label: 'Profit', apiType: 'profit', iconWeb: 'TrendingUp', iconMobile: 'trending-up-outline' },
];

/** Tabs shown in the mobile Reports screen. */
export const MOBILE_REPORT_MODULES = REPORT_MODULES;

export type MobileReportTypeId = (typeof MOBILE_REPORT_MODULES)[number]['id'];
