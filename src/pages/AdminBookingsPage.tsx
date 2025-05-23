
import AdminLayout from "@/components/admin/AdminLayout";
import { AdminBookingsList } from "@/components/admin/AdminBookingsList";
import React from "react";

export default function AdminBookingsPage() {
  return (
    <AdminLayout activeTab="bookings">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Bookings</h1>
        <AdminBookingsList />
      </div>
    </AdminLayout>
  );
} 
