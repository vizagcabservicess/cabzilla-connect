
import { BookingStatus } from '@/types/api';

/**
 * Determines if a booking is editable based on its status
 * @param status - The current status of the booking
 * @returns Boolean indicating if booking is editable
 */
export const isBookingEditable = (status: BookingStatus): boolean => {
  // Bookings can be edited unless they are completed or cancelled
  const nonEditableStatuses: BookingStatus[] = ['completed', 'cancelled'];
  return !nonEditableStatuses.includes(status);
};

/**
 * Gets the next possible status for a booking based on current status
 * @param currentStatus - The current status of the booking
 * @returns The next logical status in the flow or null if at end of flow
 */
export const getNextBookingStatus = (currentStatus: BookingStatus): BookingStatus | null => {
  const statusFlow: BookingStatus[] = [
    'pending',
    'confirmed',
    'assigned',
    'payment_received',
    'completed'
  ];

  const currentIndex = statusFlow.indexOf(currentStatus);
  
  if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
    return null;
  }
  
  return statusFlow[currentIndex + 1];
};

/**
 * Format status for display
 * @param status - The booking status
 * @returns Formatted status string
 */
export const formatBookingStatus = (status: BookingStatus): string => {
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get appropriate color class for status badge
 * @param status - The booking status
 * @returns Tailwind CSS color class
 */
export const getStatusColorClass = (status: BookingStatus): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'assigned':
      return 'bg-indigo-100 text-indigo-800';
    case 'payment_received':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Calculate extra charges total from an array of charges
 * @param extraCharges - Array of extra charges objects
 * @returns Total amount of extra charges
 */
export const calculateExtraChargesTotal = (
  extraCharges?: { amount: number; description: string }[]
): number => {
  if (!extraCharges || extraCharges.length === 0) {
    return 0;
  }
  
  return extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
};
