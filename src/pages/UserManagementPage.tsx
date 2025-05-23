
import AdminLayout from "@/components/admin/AdminLayout";
import { UserManagement } from "@/components/admin/UserManagement";

export default function UserManagementPage() {
  return (
    <AdminLayout activeTab="users">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Users</h1>
        <UserManagement />
      </div>
    </AdminLayout>
  );
} 
