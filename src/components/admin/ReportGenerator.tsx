
import React, { useState, useEffect } from 'react';
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
  Filter
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
import { GstReportData } from '@/types/api';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ReportGeneratorProps {
  reportType?: string;
  dateRange?: DateRange;
}

// Payment method options for filtering
const PAYMENT_METHODS = [
  { value: '', label: 'All Payment Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

// This will be imported from a proper API service
const fetchReportData = async (
  reportType: string, 
  dateRange: DateRange | undefined,
  periodFilter: string = 'custom',
  withGst: boolean = false,
  paymentMethod: string = ''
) => {
  try {
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
    
    if (withGst) {
      apiParams.gst = 'true';
    }
    
    if (paymentMethod) {
      apiParams.payment_method = paymentMethod;
    }
    
    const queryString = Object.entries(apiParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    const apiBaseUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
      ? `${window.location.protocol}//${window.location.host}`
      : 'https://vizagup.com';
    
    const url = `${apiBaseUrl}/api/admin/reports.php?${queryString}`;
    console.log('Fetching report from:', url);
    
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
    
    const data = await response.json();
    console.log('Report API response:', data);
    
    if (data.status === 'success') {
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to retrieve report data');
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    throw error;
  }
};

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
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [filtersVisible, setFiltersVisible] = useState<boolean>(false);
  const { toast } = useToast();

  // Effect for loading report data
  useEffect(() => {
    loadReport();
  }, [activeTab]);

  // Don't auto-reload when date changes, only when tab or period changes
  // This prevents multiple reloads when adjusting dates
  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await fetchReportData(activeTab, dateRange, periodFilter, withGst, paymentMethod);
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
      } else {
        setReportData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadReport();
  };

  const handleRefresh = () => {
    loadReport();
  };

  const handleExportCSV = () => {
    // Check if there's data to export based on the report type
    let dataEmpty = false;
    
    if (activeTab === 'gst' && reportData) {
      // GST report has a specific structure
      dataEmpty = !reportData.gstInvoices || reportData.gstInvoices.length === 0;
    } else if (Array.isArray(reportData)) {
      // For other reports, check if data is an empty array
      dataEmpty = reportData.length === 0;
    } else if (!reportData) {
      // No data at all
      dataEmpty = true;
    }
    
    if (dataEmpty) {
      toast({
        title: "Nothing to export",
        description: "Generate a report first before exporting",
        variant: "destructive",
      });
      return;
    }

    try {
      // Handle different data structures based on report type
      let dataToExport: any[] = [];
      
      if (activeTab === 'gst' && reportData.gstInvoices) {
        // GST report has a nested structure
        dataToExport = reportData.gstInvoices;
      } else if (Array.isArray(reportData)) {
        // Regular array data
        dataToExport = reportData;
      } else if (reportData && typeof reportData === 'object') {
        // Handle nested data structures
        if (activeTab === 'bookings' && reportData.dailyBookings) {
          dataToExport = reportData.dailyBookings;
        } else if (activeTab === 'drivers' && reportData.drivers) {
          dataToExport = reportData.drivers;
        } else if (activeTab === 'vehicles' && reportData.vehicles) {
          dataToExport = reportData.vehicles;
        } else if (activeTab === 'maintenance' && reportData.maintenance) {
          dataToExport = reportData.maintenance;
        } else if (activeTab === 'nongst' && reportData.bills) {
          dataToExport = reportData.bills;
        } else if (activeTab === 'ledger' && reportData.entries) {
          dataToExport = reportData.entries;
        } else if (activeTab === 'fuels' && reportData.fuels) {
          dataToExport = reportData.fuels;
        } else {
          // Just use the report data as is (may need to be flattened)
          dataToExport = [reportData];
        }
      } else {
        // Single object or other structure, convert appropriately
        dataToExport = [reportData];
      }

      // Get headers from the first object
      if (dataToExport.length > 0) {
        const headers = Object.keys(dataToExport[0]);
        
        // Convert data to CSV rows
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
        
        // Join rows with newlines
        const csvString = csvRows.join('\n');
        
        // Create download link
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${activeTab}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
        
        toast({
          title: "CSV Export Complete",
          description: "Your report has been exported to CSV successfully"
        });
      } else {
        toast({
          title: "Export Failed",
          description: "No data available for export",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
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
        return <ReportBookingsTable data={reportData} />;
      case 'revenue':
        return <ReportRevenueTable data={reportData} withGst={withGst} />;
      case 'drivers':
        return <ReportDriversTable data={reportData} />;
      case 'vehicles':
        return <ReportVehiclesTable data={reportData} />;
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
      default:
        return null;
    }
  };

  // Get the appropriate icon for each tab
  const getTabIcon = (tabValue: string) => {
    switch (tabValue) {
      case 'bookings':
        return <CalendarCheck className="h-4 w-4 mr-2" />;
      case 'revenue':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'drivers':
        return <Car className="h-4 w-4 mr-2" />;
      case 'vehicles':
        return <Car className="h-4 w-4 mr-2" />;
      case 'gst':
        return <Receipt className="h-4 w-4 mr-2" />;
      case 'nongst':
        return <Receipt className="h-4 w-4 mr-2" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 mr-2" />;
      case 'ledger':
        return <BookOpen className="h-4 w-4 mr-2" />;
      case 'fuels':
        return <Fuel className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">Generate and analyze business reports</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Report Filters</h4>
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select 
                    value={paymentMethod} 
                    onValueChange={(value) => setPaymentMethod(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PAYMENT_METHODS.map(method => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="gst-filter" 
                    checked={withGst}
                    onCheckedChange={(checked) => setWithGst(checked as boolean)}
                  />
                  <Label htmlFor="gst-filter">Include GST calculations</Label>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    handleApplyFilters();
                  }}
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
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-9 gap-1">
              <TabsTrigger value="bookings" className="flex items-center">
                <CalendarCheck className="h-4 w-4 mr-2 hidden md:block" />
                <span>Bookings</span>
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex items-center">
                <FileText className="h-4 w-4 mr-2 hidden md:block" />
                <span>Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="drivers" className="flex items-center">
                <Car className="h-4 w-4 mr-2 hidden md:block" />
                <span>Drivers</span>
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="flex items-center">
                <Car className="h-4 w-4 mr-2 hidden md:block" />
                <span>Vehicles</span>
              </TabsTrigger>
              <TabsTrigger value="gst" className="flex items-center">
                <Receipt className="h-4 w-4 mr-2 hidden md:block" />
                <span>GST</span>
              </TabsTrigger>
              <TabsTrigger value="nongst" className="flex items-center">
                <Receipt className="h-4 w-4 mr-2 hidden md:block" />
                <span>Non-GST</span>
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center">
                <Wrench className="h-4 w-4 mr-2 hidden md:block" />
                <span>Maintenance</span>
              </TabsTrigger>
              <TabsTrigger value="ledger" className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2 hidden md:block" />
                <span>Ledger</span>
              </TabsTrigger>
              <TabsTrigger value="fuels" className="flex items-center">
                <Fuel className="h-4 w-4 mr-2 hidden md:block" />
                <span>Fuels</span>
              </TabsTrigger>
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
