
import React, { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ReportGenerator } from '@/components/admin/ReportGenerator';
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("reports");
  const [reportType, setReportType] = useState<string>("gst");  // Set default to GST report
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <ReportGenerator reportType={reportType} dateRange={date} />
      </main>
    </div>
  );
}
