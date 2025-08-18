import React from 'react';
import { Link } from 'react-router-dom';

export function RoutingTest() {
  const adminRoutes = [
    { path: '/admin', label: 'Admin Dashboard' },
    { path: '/admin/vehicles', label: 'Vehicles' },
    { path: '/admin/drivers', label: 'Drivers' },
    { path: '/admin/fares', label: 'Fares' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/bookings', label: 'Bookings' },
    { path: '/admin/fleet', label: 'Fleet Management' },
    { path: '/admin/reports', label: 'Reports' },
  ];

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
      <h3 className="font-bold text-blue-800 mb-4">Admin Route Test</h3>
      <div className="space-y-2">
        {adminRoutes.map((route) => (
          <div key={route.path} className="flex items-center gap-2">
            <Link 
              to={route.path} 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {route.label}
            </Link>
            <span className="text-gray-500">({route.path})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
