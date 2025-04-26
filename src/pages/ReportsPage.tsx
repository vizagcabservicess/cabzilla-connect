
import React from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ReportGenerator } from '@/components/admin/ReportGenerator';

export default function ReportsPage() {
  return (
    <AdminLayout>
      <ReportGenerator />
    </AdminLayout>
  );
}
