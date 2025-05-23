import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBookingsList } from "@/components/admin/AdminBookingsList";
import React, { useState } from "react";

export default function AdminBookingsPage() {
  const [activeTab, setActiveTab] = useState("bookings");
  return (
    <div className="flex min-h-screen">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold mb-4">Bookings</h1>
          <AdminBookingsList />
        </div>
      </main>
    </div>
  );
} 