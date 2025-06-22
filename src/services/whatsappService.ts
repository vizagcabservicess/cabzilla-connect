
import { Booking } from '@/types/api';

export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with country code (91 for India), use as is
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }
  
  // If it's a 10-digit number, add country code
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  return cleaned;
}

export function generateBookingConfirmationMessage(booking: Booking): string {
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  const pickupLocation = typeof booking.pickup_location === 'string' 
    ? booking.pickup_location 
    : booking.pickup_location?.city || 'Unknown';
  const dropLocation = booking.drop_location 
    ? typeof booking.drop_location === 'string' 
      ? booking.drop_location 
      : booking.drop_location?.city 
    : 'N/A';

  return `🚗 *Booking Confirmation - Vizag Taxi Hub*

Hello ${passengerName}!

Your cab booking has been confirmed:

📍 *Pickup:* ${pickupLocation}
📍 *Drop:* ${dropLocation}
📅 *Date:* ${booking.pickup_date}
🚗 *Vehicle:* ${booking.vehicle_type}
💰 *Fare:* ₹${booking.fare}
📋 *Status:* ${booking.status}

*Booking ID:* ${booking.id}

Thank you for choosing Vizag Taxi Hub! 🙏

For any queries, please contact us.`;
}
