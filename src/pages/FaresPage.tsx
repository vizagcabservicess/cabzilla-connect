import AdminLayout from "@/components/admin/AdminLayout";
import FareManagement from "@/components/admin/FareManagement";

export default function FaresPage() {
  return (
    <AdminLayout activeTab="fares">
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-4">Fares</h1>
        <FareManagement />
      </div>
    </AdminLayout>
  );
} 