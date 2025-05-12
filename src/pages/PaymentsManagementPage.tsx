
import React, { useEffect, useState } from 'react';
import { PaymentManagement } from '@/components/admin/payment/PaymentManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

// Create a client specifically for this page to avoid conflicts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function PaymentsManagementPage() {
  const [activeTab, setActiveTab] = useState('payments');
  
  useEffect(() => {
    // Set page title
    document.title = 'Payment Management | Admin Dashboard';
    
    // Add logging for debugging
    console.log('Payment Management Page loaded');
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-6">Payment Management</h1>
          <QueryClientProvider client={queryClient}>
            <PaymentManagement />
          </QueryClientProvider>
        </div>
      </main>
    </div>
  );
}
