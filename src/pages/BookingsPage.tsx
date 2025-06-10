import AdminLayout from "@/components/admin/AdminLayout";
import { AdminBookingsList } from "@/components/admin/AdminBookingsList";

export default function BookingsPage() {
  return (
    <AdminLayout activeTab="bookings">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-medium mb-4">Bookings</h1>
        <AdminBookingsList />
      </div>
    </AdminLayout>
  );
} 
