import AdminLayout from "@/components/admin/AdminLayout";
import { DriverManagement } from "@/components/admin/DriverManagement";

export default function DriversPage() {
  return (
    <AdminLayout activeTab="drivers">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-medium mb-4">Drivers</h1>
        <DriverManagement />
      </div>
    </AdminLayout>
  );
} 
