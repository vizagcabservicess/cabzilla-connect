
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
    : booking.pickup_location?.city || booking.pickupLocation || 'Unknown';
  const dropLocation = booking.drop_location 
    ? typeof booking.drop_location === 'string' 
      ? booking.drop_location 
      : booking.drop_location?.city || booking.dropLocation
    : 'N/A';

  return `🚗 *Booking Confirmation - Vizag Taxi Hub*

Hello ${passengerName}!

Your cab booking has been confirmed:

📍 *Pickup:* ${pickupLocation}
📍 *Drop:* ${dropLocation}
📅 *Date:* ${booking.pickup_date || booking.pickupDate}
🚗 *Vehicle:* ${booking.vehicle_type || booking.cabType}
💰 *Fare:* ₹${booking.fare || booking.totalAmount}
📋 *Status:* ${booking.status}

*Booking ID:* ${booking.id}

Thank you for choosing Vizag Taxi Hub! 🙏

For any queries, please contact us.`;
}

export function generateDriverAssignmentMessage(booking: Booking): string {
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  const pickupLocation = typeof booking.pickup_location === 'string' 
    ? booking.pickup_location 
    : booking.pickup_location?.city || booking.pickupLocation || 'Unknown';
  const dropLocation = booking.drop_location 
    ? typeof booking.drop_location === 'string' 
      ? booking.drop_location 
      : booking.drop_location?.city || booking.dropLocation
    : 'N/A';

  return `🚗 *Driver Assignment - Vizag Taxi Hub*

Hello ${passengerName}!

Your driver has been assigned:

👨‍💼 *Driver:* ${booking.driverName}
📱 *Phone:* ${booking.driverPhone}
🚗 *Vehicle:* ${booking.vehicleNumber}

📍 *Pickup:* ${pickupLocation}
📍 *Drop:* ${dropLocation}
📅 *Date:* ${booking.pickup_date || booking.pickupDate}

*Booking ID:* ${booking.id}

Your driver will contact you shortly. Safe travels! 🙏`;
}

export function generateInvoiceMessage(booking: Booking, invoiceUrl?: string): string {
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  
  return `🧾 *Invoice - Vizag Taxi Hub*

Hello ${passengerName}!

Your invoice is ready:

💰 *Amount:* ₹${booking.fare || booking.totalAmount}
📋 *Booking ID:* ${booking.id}
📅 *Date:* ${booking.pickup_date || booking.pickupDate}

${invoiceUrl ? `📄 *Download Invoice:* ${invoiceUrl}` : ''}

Thank you for choosing Vizag Taxi Hub! 🙏`;
}

export function generateDriverNotificationMessage(booking: Booking): string {
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  const pickupLocation = typeof booking.pickup_location === 'string' 
    ? booking.pickup_location 
    : booking.pickup_location?.city || booking.pickupLocation || 'Unknown';
  const dropLocation = booking.drop_location 
    ? typeof booking.drop_location === 'string' 
      ? booking.drop_location 
      : booking.drop_location?.city || booking.dropLocation
    : 'N/A';

  return `🚗 *New Trip Assignment - Vizag Taxi Hub*

You have been assigned a new trip:

👤 *Passenger:* ${passengerName}
📱 *Phone:* ${booking.passengerPhone}

📍 *Pickup:* ${pickupLocation}
📍 *Drop:* ${dropLocation}
📅 *Date:* ${booking.pickup_date || booking.pickupDate}

💰 *Fare:* ₹${booking.fare || booking.totalAmount}
📋 *Booking ID:* ${booking.id}

Please contact the passenger and proceed to pickup location. Safe driving! 🙏`;
}
