
import React, { useEffect } from 'react';
import { PaymentManagement } from '@/components/admin/payment/PaymentManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  useEffect(() => {
    // Set page title
    document.title = 'Payment Management | Admin Dashboard';
    
    // Add logging for debugging
    console.log('Payment Management Page loaded');
  }, []);

  return (
    <div className="container mx-auto py-8">
      <PaymentManagement />
    </div>
  );
}
