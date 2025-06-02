import React from 'react';

export default function GuestDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to the Pooling Platform</h1>
        <p className="mb-4">You are logged in as a <span className="font-semibold text-blue-600">Guest</span>.</p>
        <p className="mb-4">You can now search for rides, book seats, and manage your pooling bookings.</p>
        <p className="text-gray-500">If you want to offer rides, please register as a provider.</p>
      </div>
    </div>
  );
} 