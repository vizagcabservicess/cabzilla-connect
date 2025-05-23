import { AdminBookingsList } from "@/components/admin/AdminBookingsList";

export default function BookingsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-4">Bookings</h1>
      <AdminBookingsList />
    </div>
  );
} 