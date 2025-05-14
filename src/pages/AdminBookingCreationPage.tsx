
import { useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminBookingForm } from '@/components/admin/AdminBookingForm';
import { useToast } from '@/components/ui/use-toast';

export default function AdminBookingCreationPage() {
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if admin is logged in - this is a placeholder, implement actual auth check
    const isAdmin = localStorage.getItem('role') === 'admin';
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      // Redirect to login page or show access denied
    }
  }, [toast]);

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab="create-booking" setActiveTab={() => {}} />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Create New Booking</h1>
          <AdminBookingForm />
        </div>
      </div>
    </div>
  );
}
