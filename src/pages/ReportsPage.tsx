import React, { useState } from 'react';
import { ReportGenerator } from '@/components/admin/ReportGenerator';
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("reports");
  const [reportType, setReportType] = useState<string>("bookings");
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  return (
    <AdminLayout activeTab="reports">
      <div className="flex-1 overflow-y-auto p-8">
        <ReportGenerator reportType={reportType} dateRange={date} />
      </div>
    </AdminLayout>
  );
}
