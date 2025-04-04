
import React from 'react';
import { StatusPage } from './StatusPage';

export function AdminSystemStatus() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">System Status</h1>
      <StatusPage />
    </div>
  );
}

export default AdminSystemStatus;
