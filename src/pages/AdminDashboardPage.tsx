
import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { DashboardMetrics as MetricsType } from '@/types/api';

export default function AdminDashboardPage() {
  const mockMetrics: MetricsType = {
    totalBookings: 150,
    completedBookings: 120,
    pendingBookings: 30,
    cancelledBookings: 5,
    revenue: {
      total: 450000,
      thisMonth: 45000,
      lastMonth: 38000
    }
  };

  return (
    <AdminLayout activeTab="dashboard">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Dashboard</h1>
        
        <DashboardMetrics 
          metrics={mockMetrics}
          isLoading={false}
        />
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
            <p className="text-gray-500">Recent bookings will be displayed here.</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Chart</h3>
            <p className="text-gray-500">Revenue chart will be displayed here.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
