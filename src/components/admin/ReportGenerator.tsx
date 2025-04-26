
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Download, RefreshCw, FileText } from 'lucide-react';
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

// This will be imported from a proper API service
const fetchReportData = async (reportType: string, dateRange: DateRange | undefined) => {
  try {
    const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd');
    const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    
    const apiBaseUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
      ? `${window.location.protocol}//${window.location.host}`
      : 'https://vizagup.com';
    
    const url = `${apiBaseUrl}/api/admin/reports.php?type=${reportType}&start_date=${startDate}&end_date=${endDate}`;
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

export function ReportGenerator() {
  const [activeTab, setActiveTab] = useState<string>('bookings');
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const { toast } = useToast();

  useEffect(() => {
    loadReport();
  }, [activeTab, dateRange]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await fetchReportData(activeTab, dateRange);
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
      // Get headers from the first object
      const headers = Object.keys(reportData[0]);
      
      // Convert data to CSV rows
      const csvRows = [
        headers.join(','), // Header row
        ...reportData.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
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

    if (!reportData || reportData.length === 0) {
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
        return <ReportRevenueTable data={reportData} />;
      case 'drivers':
        return <ReportDriversTable data={reportData} />;
      case 'vehicles':
        return <ReportVehiclesTable data={reportData} />;
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
          <DatePickerWithRange 
            date={dateRange} 
            setDate={setDateRange} 
            className="w-full sm:w-auto"
          />
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
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="drivers">Drivers</TabsTrigger>
              <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          {renderReportTable()}
        </CardContent>
      </Card>
    </div>
  );
}
