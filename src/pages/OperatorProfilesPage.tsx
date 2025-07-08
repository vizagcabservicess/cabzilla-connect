import AdminLayout from "@/components/admin/AdminLayout";
import { AdminProfileManagement } from "@/components/admin/AdminProfileManagement";

export default function OperatorProfilesPage() {
  return (
    <AdminLayout activeTab="operator-profiles">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-medium mb-4">Operator Profiles</h1>
        <AdminProfileManagement />
      </div>
    </AdminLayout>
  );
} 