import AdminLayout from "@/components/admin/AdminLayout";
import { AdminBookingsList } from "@/components/admin/AdminBookingsList";

export default function BookingsPage() {
  return (
    <AdminLayout activeTab="bookings">
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-medium">Bookings</h1>
        <AdminBookingsList />
      </div>
    </AdminLayout>
  );
} 
