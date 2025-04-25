
import { Booking, BookingStatus } from '@/types/api';

export const isBookingEditable = (status: BookingStatus): boolean => {
  return ['pending', 'confirmed'].includes(status);
};

export const getStatusColor = (status: BookingStatus): string => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'completed': return 'bg-blue-100 text-blue-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'assigned': return 'bg-purple-100 text-purple-800';
    case 'payment_received': return 'bg-green-100 text-green-800';
    case 'payment_pending': return 'bg-orange-100 text-orange-800';
    case 'continued': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const formatBookingDate = (date: string): string => {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return date; // Return original string if formatting fails
  }
};

export const getNextStatus = (currentStatus: BookingStatus): BookingStatus | null => {
  const statusFlow = {
    pending: 'confirmed',
    confirmed: 'assigned',
    assigned: 'completed',
    completed: null,
    cancelled: null,
    payment_pending: 'payment_received',
    payment_received: 'completed',
    continued: 'completed'
  };
  
  return statusFlow[currentStatus] || null;
};

export const isPastStatus = (bookingStatus: BookingStatus, checkStatus: BookingStatus): boolean => {
  const statusOrder = ['pending', 'confirmed', 'assigned', 'completed'];
  
  if (bookingStatus === 'cancelled') return false;
  if (checkStatus === 'cancelled') return false;
  
  const currentIndex = statusOrder.indexOf(bookingStatus);
  const checkIndex = statusOrder.indexOf(checkStatus);
  
  if (currentIndex === -1 || checkIndex === -1 || currentIndex < checkIndex) {
    return false;
  }
  
  return true;
};

export const calculatePriceBreakdown = (totalAmount: number) => {
  if (!totalAmount) return { baseFare: 0, taxes: 0 };
  
  const baseFare = Math.round(totalAmount * 0.85);
  const taxes = Math.round(totalAmount * 0.15);
  return { baseFare, taxes };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper to ensure tab visibility
export const ensureTabVisibility = (tabId: string) => {
  // Hide all panels first
  document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
    panel.setAttribute('style', 'display: none !important');
  });
  
  // Show only the active panel
  const activePanel = document.querySelector(`#${tabId}-panel`);
  if (activePanel) {
    activePanel.setAttribute('style', 'display: block !important');
  }
};
