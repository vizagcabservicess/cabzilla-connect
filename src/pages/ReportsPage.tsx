
import React, { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ReportGenerator } from '@/components/admin/ReportGenerator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, BarChart3, PieChart, CalendarCheck } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("reports");
  const [reportTab, setReportTab] = useState<string>("bookings");
  const [reportType, setReportType] = useState<string>("summary");
  const [reportPeriod, setReportPeriod] = useState<string>("monthly");
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [withGst, setWithGst] = useState<boolean>(false);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      // This would be an API call to generate the report
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Generating report with:", { reportType, reportTab, reportPeriod, dateRange: date, withGst });
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating report:", error);
      setIsLoading(false);
    }
  };

  const handleExportReport = (format: string) => {
    console.log(`Exporting report as ${format}`);
    // Implementation for export functionality
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <div className="flex gap-2">
            <Button onClick={() => handleExportReport('pdf')} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={() => handleExportReport('csv')} variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Report Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Period</label>
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {reportPeriod === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <DatePickerWithRange date={date} setDate={setDate} />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Report</SelectItem>
                    <SelectItem value="detailed">Detailed Report</SelectItem>
                    <SelectItem value="financial">Financial Report</SelectItem>
                    <SelectItem value="gst">GST Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="lg:col-span-2 self-end">
                <Button 
                  onClick={handleGenerateReport} 
                  className="w-full"
                  disabled={isLoading}
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={reportTab} onValueChange={setReportTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="gst">GST</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bookings" className="space-y-6">
            <ReportGenerator reportType="bookings" dateRange={date} />
          </TabsContent>
          
          <TabsContent value="drivers" className="space-y-6">
            <ReportGenerator reportType="drivers" dateRange={date} />
          </TabsContent>
          
          <TabsContent value="revenue" className="space-y-6">
            <ReportGenerator reportType="revenue" dateRange={date} />
          </TabsContent>
          
          <TabsContent value="vehicles" className="space-y-6">
            <ReportGenerator reportType="vehicles" dateRange={date} />
          </TabsContent>
          
          <TabsContent value="gst" className="space-y-6">
            <ReportGenerator reportType="gst" dateRange={date} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
