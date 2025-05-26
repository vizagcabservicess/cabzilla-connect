
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
  const [onlyGstEnabled, setOnlyGstEnabled] = useState<boolean>(true); // Default to true for GST reports
  const { toast } = useToast();

  // Effect for loading report data
  useEffect(() => {
    loadReport();
  }, [activeTab]);

  // Effect to automatically set onlyGstEnabled when switching to GST tab
  useEffect(() => {
    if (activeTab === 'gst') {
      setOnlyGstEnabled(true);
    }
  }, [activeTab]);

  // Load report data
  const loadReport = async () => {
    try {
      setLoading(true);
      
      const filterParams: ReportFilterParams = {
        reportType: activeTab,
        dateRange,
        periodFilter,
        withGst,
        paymentMethod,
        onlyGstEnabled: activeTab === 'gst' ? true : onlyGstEnabled
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

                {activeTab !== 'gst' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="only-gst-enabled-filter" 
                      checked={onlyGstEnabled}
                      onCheckedChange={(checked) => setOnlyGstEnabled(checked as boolean)}
                    />
                    <Label htmlFor="only-gst-enabled-filter">Only GST-enabled invoices</Label>
                  </div>
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
