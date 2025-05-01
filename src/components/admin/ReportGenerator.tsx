
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Download, RefreshCw, FileText, CalendarCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from 'lucide-react';
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from 'react-day-picker';
import { ReportBookingsTable } from './reports/ReportBookingsTable';
import { ReportRevenueTable } from './reports/ReportRevenueTable';
import { ReportDriversTable } from './reports/ReportDriversTable';
import { ReportVehiclesTable } from './reports/ReportVehiclesTable';
import { ReportGstTable } from './reports/ReportGstTable';
import { 
  Select,
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ReportGeneratorProps {
  reportType?: string;
  dateRange?: DateRange;
}

// This will be imported from a proper API service
const fetchReportData = async (
  reportType: string, 
  dateRange: DateRange | undefined,
  periodFilter: string = 'custom',
  withGst: boolean = false
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
  const [reportData, setReportData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialDateRange || {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    }
  );
  const [periodFilter, setPeriodFilter] = useState<string>('custom');
  const [withGst, setWithGst] = useState<boolean>(false);
  const { toast } = useToast();

  // Effect for handling period filter changes
  useEffect(() => {
    // If period filter is not custom, date range becomes disabled
    // No need to modify dateRange as the backend will calculate it based on period
  }, [periodFilter]);

  // Effect for loading report data
  useEffect(() => {
    loadReport();
  }, [activeTab]);

  // Don't auto-reload when date changes, only when tab or period changes
  // This prevents multiple reloads when adjusting dates
  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await fetchReportData(activeTab, dateRange, periodFilter, withGst);
      setReportData(data);
    } catch (error) {
      toast({
        title: "Failed to load report",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReport();
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
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
          ...dataToExport.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
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

    if (!reportData || 
        (Array.isArray(reportData) && reportData.length === 0) || 
        (activeTab === 'gst' && (!reportData.gstInvoices || reportData.gstInvoices.length === 0))) {
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
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="drivers">Drivers</TabsTrigger>
              <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
              <TabsTrigger value="gst">GST</TabsTrigger>
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
            
            {(activeTab === 'revenue' || activeTab === 'gst') && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="gst-filter" 
                  checked={withGst}
                  onCheckedChange={(checked) => setWithGst(checked as boolean)}
                />
                <Label htmlFor="gst-filter">Include GST calculations</Label>
              </div>
            )}
          </div>
          
          {renderReportTable()}
        </CardContent>
      </Card>
    </div>
  );
}
