
import React from 'react';
import { VehicleManagement } from '@/components/admin/VehicleManagement';

export default function VehiclesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Vehicle Management</h1>
      </div>
      
      <VehicleManagement />
    </div>
  );
}
