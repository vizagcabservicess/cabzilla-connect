
import AdminLayout from "@/components/admin/AdminLayout";
import VehicleManagement from "@/components/admin/VehicleManagement";

export default function VehiclesPage() {
  return (
    <AdminLayout activeTab="vehicles">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Vehicles</h1>
        <VehicleManagement />
      </div>
    </AdminLayout>
  );
} 
