
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  RefreshCw, 
  FileText, 
  CalendarCheck, 
  Fuel, 
  Car, 
  Receipt, 
  BookOpen, 
  Wrench,
  Filter,
  TrendingUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from 'react-day-picker';
import { ReportBookingsTable } from './reports/ReportBookingsTable';
import { ReportRevenueTable } from './reports/ReportRevenueTable';
import { ReportDriversTable } from './reports/ReportDriversTable';
import { ReportVehiclesTable } from './reports/ReportVehiclesTable';
import { ReportGstTable } from './reports/ReportGstTable';
import { ReportNonGstTable } from './reports/ReportNonGstTable';
import { ReportMaintenanceTable } from './reports/ReportMaintenanceTable';
import { ReportLedgerTable } from './reports/ReportLedgerTable';
import { ReportFuelsTable } from './reports/ReportFuelsTable';
import { ReportProfitTable } from './reports/ReportProfitTable';
import { 
  Select,
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  fetchReport,
  exportReportToCSV
} from '@/services/reportsAPI';
import { ReportFilterParams } from '@/types/reports';
import { apiBaseUrl } from '@/config/api';
import { REPORT_MODULES } from '@/config/reportModules';

interface ReportGeneratorProps {
  reportType?: string;
  dateRange?: DateRange;
}

// Payment method options for filtering (Radix Select requires non-empty values)
const PAYMENT_METHODS = [
  { value: 'all', label: 'All Payment Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const TRIP_STATUS_FILTERS = [
  { value: 'all', label: 'All trip statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUS_FILTERS = [
  { value: 'all', label: 'All payment statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
];

/** Native selects inside the Filters popover avoid Radix Select's RemoveScroll (fixes layout shift / content sliding left). */
const FILTER_POPOVER_SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function ReportGenerator({ reportType: initialReportType, dateRange: initialDateRange }: ReportGeneratorProps = {}) {
  const [activeTab, setActiveTab] = useState<string>(initialReportType || 'bookings');
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialDateRange || {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    }
  );
  const [periodFilter, setPeriodFilter] = useState<string>('custom');
  const [withGst, setWithGst] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [onlyGstEnabled, setOnlyGstEnabled] = useState<boolean>(false);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('');
  const [tripStatus, setTripStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [filterVehicles, setFilterVehicles] = useState<Array<{ id: string | number; name: string; vehicle_number?: string }>>([]);
  const { toast } = useToast();

  // Ref to hold latest filter values — avoids stale closure when Apply runs before state commits
  const filtersRef = useRef({
    vehicleId,
    driverId,
    serviceType,
    dateRange,
    periodFilter,
    withGst,
    paymentMethod,
    onlyGstEnabled,
    tripStatus,
    paymentStatus,
  });
  filtersRef.current = {
    vehicleId,
    driverId,
    serviceType,
    dateRange,
    periodFilter,
    withGst,
    paymentMethod,
    onlyGstEnabled,
    tripStatus,
    paymentStatus,
  };

  // Fetch vehicles for filter dropdown - use reports filter_options (same API as reports) then fleet API as fallback
  useEffect(() => {
    if (activeTab !== 'vehicles' && activeTab !== 'profit') return;
    const fetchVehicles = async () => {
      try {
        // Primary: reports.php?type=filter_options&filter=vehicles (same API that serves reports)
        const reportsUrl = `${apiBaseUrl}/api/admin/reports.php?type=filter_options&filter=vehicles&period=custom&start_date=${format(dateRange?.from ?? new Date(), 'yyyy-MM-dd')}&end_date=${format(dateRange?.to ?? new Date(), 'yyyy-MM-dd')}`;
        const res = await fetch(reportsUrl, { headers: { 'Cache-Control': 'no-cache', 'X-Force-Refresh': 'true' } });
        if (res.ok) {
          const text = await res.text();
          if (!text?.trim()) return;
          const json = JSON.parse(text);
          const data = json?.data ?? json;
          const vehicles = data?.vehicles ?? data?.filters?.vehicles ?? [];
          const list = (Array.isArray(vehicles) ? vehicles : []).map((v: { id: number; name?: string; vehicle_number?: string }) => ({
            id: v.id,
            name: String(v.name || v.vehicle_number || `Vehicle ${v.id}`),
            vehicle_number: v.vehicle_number ?? ''
          }));
          if (list.length > 0) {
            setFilterVehicles(list);
            return;
          }
        }
        // Fallback: fleet_vehicles API
        const fleetUrl = `${apiBaseUrl}/api/admin/fleet_vehicles.php/vehicles?includeInactive=true`;
        const fleetRes = await fetch(fleetUrl, { headers: { 'Cache-Control': 'no-cache' } });
        if (!fleetRes.ok) return;
        const fleetJson = await fleetRes.json();
        const fleetList = (fleetJson?.vehicles || []).map((v: { id: number; name?: string; vehicleNumber?: string; vehicle_number?: string }) => ({
          id: v.id,
          name: v.name || v.vehicleNumber || v.vehicle_number || `Vehicle ${v.id}`,
          vehicle_number: v.vehicleNumber ?? v.vehicle_number ?? ''
        }));
        setFilterVehicles(fleetList);
      } catch {
        setFilterVehicles([]);
      }
    };
    fetchVehicles();
  }, [activeTab]);

  // Effect for loading report data when tab changes
  useEffect(() => {
    loadReport();
  }, [activeTab]);

  // Auto-reload when vehicle/driver/service filters change (Vehicles or Profit tab) — pass values explicitly to avoid stale closure
  useEffect(() => {
    if (activeTab !== 'vehicles' && activeTab !== 'profit') return;
    filtersRef.current = { vehicleId, driverId, serviceType, dateRange, periodFilter, withGst, paymentMethod, onlyGstEnabled, tripStatus, paymentStatus };
    loadReport({ vehicleId: vehicleId || undefined, driverId: driverId || undefined, serviceType: serviceType || undefined });
  }, [activeTab, vehicleId, driverId, serviceType]);

  // Effect to automatically set onlyGstEnabled when switching to GST tab
  useEffect(() => {
    if (activeTab === 'gst') {
      setOnlyGstEnabled(true);
    }
  }, [activeTab]);

  // Load report data — reads from filtersRef (or explicit overrides) to avoid stale closure
  const loadReport = async (overrides?: { vehicleId?: string; driverId?: string; serviceType?: string }) => {
    try {
      setLoading(true);
      const f = filtersRef.current;
      const vId = overrides?.vehicleId ?? ((activeTab === 'profit' || activeTab === 'vehicles') ? (f.vehicleId || undefined) : undefined);
      const dId = overrides?.driverId ?? (activeTab === 'profit' ? (f.driverId || undefined) : undefined);
      const sType = overrides?.serviceType ?? (activeTab === 'profit' ? (f.serviceType || undefined) : undefined);
      const filterParams: ReportFilterParams = {
        reportType: activeTab,
        dateRange: f.dateRange,
        periodFilter: f.periodFilter,
        withGst: f.withGst,
        paymentMethod: f.paymentMethod === 'all' ? '' : f.paymentMethod,
        onlyGstEnabled: activeTab === 'gst' ? true : f.onlyGstEnabled,
        vehicleId: vId,
        driverId: dId,
        serviceType: sType,
        tripStatus: f.tripStatus === 'all' ? '' : f.tripStatus,
        paymentStatus: f.paymentStatus === 'all' ? '' : f.paymentStatus,
      };
      
      const data = await fetchReport(filterParams);
      console.log('Processed report data:', data);
      setReportData(data);
    } catch (error) {
      console.error('Error in loadReport:', error);
      toast({
        title: "Failed to load report",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      
      // Initialize with empty data structure based on report type
      if (activeTab === 'gst') {
        setReportData({ gstInvoices: [], summary: {} });
      } else if (activeTab === 'profit') {
        setReportData({ kpis: {}, dailyChart: [], revenueBreakdown: {}, expenseBreakdown: {}, vehicleProfit: [], driverProfit: [], areaReport: [], todaySnapshot: {}, filters: {} });
      } else {
        setReportData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const syncFiltersRefFromState = () => {
    filtersRef.current = {
      vehicleId,
      driverId,
      serviceType,
      dateRange,
      periodFilter,
      withGst,
      paymentMethod,
      onlyGstEnabled,
      tripStatus,
      paymentStatus,
    };
  };

  const handleApplyFilters = () => {
    syncFiltersRefFromState();
    void loadReport();
  };

  const handleRefresh = () => {
    syncFiltersRefFromState();
    void loadReport();
  };

  const handleExportCSV = () => {
    try {
      // Check if there's data to export
      if (!reportData || 
          (Array.isArray(reportData) && reportData.length === 0) || 
          (typeof reportData === 'object' && Object.keys(reportData).length === 0)) {
        toast({
          title: "Nothing to export",
          description: "Generate a report first before exporting",
          variant: "destructive",
        });
        return;
      }

      exportReportToCSV(activeTab, reportData);
      
      toast({
        title: "CSV Export Complete",
        description: "Your report has been exported to CSV successfully"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    if (activeTab === 'profit' && reportData?.kpis) {
      window.print();
    } else {
      toast({
        title: "Export PDF",
        description: "Use Export CSV for this report, or switch to Profit tab and generate a report to print/save as PDF",
        variant: "default",
      });
    }
  };

  const renderReportTable = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Loading report...</span>
        </div>
      );
    }

    // Handle empty data states
    const isEmptyData = () => {
      if (activeTab === 'gst') {
        return !reportData || !reportData.gstInvoices || reportData.gstInvoices.length === 0;
      }
      if (activeTab === 'profit') {
        return !reportData || !reportData.kpis;
      }
      
      if (Array.isArray(reportData)) {
        return reportData.length === 0;
      }
      
      return !reportData || Object.keys(reportData).length === 0;
    };

    if (isEmptyData()) {
      return (
        <div className="text-center p-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No Report Data</h3>
          <p className="text-muted-foreground mb-4">
            No data available for the selected date range
          </p>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'bookings':
        return (
          <ReportBookingsTable
            data={reportData}
            drillDownFilters={{
              tripStatus,
              paymentStatus,
            }}
          />
        );
      case 'revenue':
        return <ReportRevenueTable data={reportData} withGst={withGst} />;
      case 'drivers':
        return <ReportDriversTable data={reportData} />;
      case 'vehicles':
        return <ReportVehiclesTable data={reportData} dateRange={dateRange} />;
      case 'gst':
        return <ReportGstTable data={reportData} />;
      case 'nongst':
        return <ReportNonGstTable data={reportData} />;
      case 'maintenance':
        return <ReportMaintenanceTable data={reportData} />;
      case 'ledger':
        return <ReportLedgerTable data={reportData} />;
      case 'fuels':
        return <ReportFuelsTable data={reportData} />;
      case 'profit':
        return <ReportProfitTable data={reportData} />;
      default:
        return null;
    }
  };

  // Icon map for report modules (driven by REPORT_MODULES)
  const TAB_ICONS: Record<string, React.ReactNode> = {
    bookings: <CalendarCheck className="h-4 w-4 mr-2" />,
    revenue: <FileText className="h-4 w-4 mr-2" />,
    drivers: <Car className="h-4 w-4 mr-2" />,
    vehicles: <Car className="h-4 w-4 mr-2" />,
    gst: <Receipt className="h-4 w-4 mr-2" />,
    nongst: <Receipt className="h-4 w-4 mr-2" />,
    maintenance: <Wrench className="h-4 w-4 mr-2" />,
    ledger: <BookOpen className="h-4 w-4 mr-2" />,
    fuels: <Fuel className="h-4 w-4 mr-2" />,
    profit: <TrendingUp className="h-4 w-4 mr-2" />,
  };
  const getTabIcon = (tabValue: string) => TAB_ICONS[tabValue] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">Generate and analyze business reports</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" avoidCollisions>
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Report Filters</h4>
                {(activeTab === 'bookings' || activeTab === 'nongst') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="trip-status-filter">Trip status</Label>
                      <select
                        id="trip-status-filter"
                        className={FILTER_POPOVER_SELECT_CLASS}
                        value={tripStatus}
                        onChange={(e) => setTripStatus(e.target.value)}
                      >
                        {TRIP_STATUS_FILTERS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-status-filter">Payment status</Label>
                      <select
                        id="payment-status-filter"
                        className={FILTER_POPOVER_SELECT_CLASS}
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                      >
                        {PAYMENT_STATUS_FILTERS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="payment-method-filter">Payment Method</Label>
                  <select
                    id="payment-method-filter"
                    className={FILTER_POPOVER_SELECT_CLASS}
                    value={paymentMethod || 'all'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.filter((m) => m.value && m.value.trim() !== '').map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="gst-filter" 
                    checked={withGst}
                    onCheckedChange={(checked) => setWithGst(checked as boolean)}
                  />
                  <Label htmlFor="gst-filter">Include GST calculations</Label>
                </div>

                {activeTab !== 'gst' && activeTab !== 'nongst' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="only-gst-enabled-filter" 
                      checked={onlyGstEnabled}
                      onCheckedChange={(checked) => setOnlyGstEnabled(checked as boolean)}
                    />
                    <Label htmlFor="only-gst-enabled-filter">Only GST-enabled invoices</Label>
                  </div>
                )}

                {(activeTab === 'vehicles' || activeTab === 'profit') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="filter-vehicle">Vehicle</Label>
                      <select
                        id="filter-vehicle"
                        className={FILTER_POPOVER_SELECT_CLASS}
                        value={vehicleId || 'all'}
                        onChange={(e) => setVehicleId(e.target.value === 'all' ? '' : e.target.value)}
                      >
                        <option value="all">All Vehicles</option>
                        {((reportData?.filters?.vehicles?.length ? reportData.filters.vehicles : filterVehicles) || [])
                          .filter((v: { id: string | number; name: string; vehicle_number?: string; vehicleNumber?: string }) => v?.id != null && v?.id !== '')
                          .map((v: { id: string | number; name: string; vehicle_number?: string; vehicleNumber?: string }) => (
                            <option key={v.id} value={String(v.id)}>
                              {v.vehicle_number || v.vehicleNumber || v.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    {activeTab === 'profit' && (
                    <>
                    <div className="space-y-2">
                      <Label htmlFor="filter-driver">Driver</Label>
                      <select
                        id="filter-driver"
                        className={FILTER_POPOVER_SELECT_CLASS}
                        value={driverId || 'all'}
                        onChange={(e) => setDriverId(e.target.value === 'all' ? '' : e.target.value)}
                      >
                        <option value="all">All Drivers</option>
                        {(reportData?.filters?.drivers || [])
                          .filter((d: { id: string | number; name: string }) => d?.id != null && d?.id !== '')
                          .map((d: { id: string | number; name: string }) => (
                            <option key={d.id} value={String(d.id)}>{d.name}</option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filter-service-type">Service Type</Label>
                      <select
                        id="filter-service-type"
                        className={FILTER_POPOVER_SELECT_CLASS}
                        value={serviceType || 'all'}
                        onChange={(e) => setServiceType(e.target.value === 'all' ? '' : e.target.value)}
                      >
                        <option value="all">All Service Types</option>
                        {(reportData?.filters?.serviceTypes || ['local', 'outstation', 'airport'])
                          .filter((s: string) => s != null && String(s).trim() !== '')
                          .map((s: string) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                      </select>
                    </div>
                    </>
                    )}
                  </>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleApplyFilters}
                >
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button className="w-full sm:w-auto" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto" 
            onClick={handleExportCSV}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          {activeTab === 'profit' && (
            <Button 
              variant="outline" 
              className="w-full sm:w-auto" 
              onClick={() => window.print()}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap gap-1">
              {REPORT_MODULES.map((mod) => (
                <TabsTrigger key={mod.id} value={mod.id} className="flex items-center">
                  {getTabIcon(mod.id)}
                  <span className="hidden md:inline">{mod.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Time Period</SelectLabel>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                    <SelectItem value="daily">Daily (Today)</SelectItem>
                    <SelectItem value="weekly">Weekly (This Week)</SelectItem>
                    <SelectItem value="monthly">Monthly (This Month)</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly (This Year)</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {periodFilter === 'custom' && (
              <div>
                <DatePickerWithRange 
                  date={dateRange} 
                  setDate={setDateRange} 
                  className="w-full"
                />
              </div>
            )}
            
            <div className="flex items-center justify-end">
              <Button 
                variant="default"
                onClick={handleApplyFilters}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Generate Report
              </Button>
            </div>
          </div>
          
          {renderReportTable()}
        </CardContent>
      </Card>
    </div>
  );
}
