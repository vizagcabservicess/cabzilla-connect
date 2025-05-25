
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 91, return as is
  if (cleaned.startsWith('91')) {
    return cleaned;
  }
  
  // If it's a 10-digit number, add 91 prefix
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  // Return as is for other formats
  return cleaned;
}

export function generateBookingConfirmationMessage(booking: any): string {
  return `🚗 *Booking Confirmation*

📋 *Booking Details:*
Booking ID: ${booking.bookingNumber || booking.id}
Passenger: ${booking.passengerName}
📞 Phone: ${booking.passengerPhone}

🗓️ *Trip Details:*
📅 Date: ${booking.pickupDate}
📍 Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `🏁 Drop: ${booking.dropLocation}` : ''}
🚗 Vehicle: ${booking.cabType}
💰 Amount: ₹${booking.totalAmount}

Status: ${booking.status}

Thank you for choosing our service! 🙏`;
}

export function generateDriverAssignmentMessage(booking: any): string {
  return `🚗 *Driver Assigned*

📋 *Booking ID:* ${booking.bookingNumber || booking.id}

👤 *Driver Details:*
Name: ${booking.driverName}
📞 Phone: ${booking.driverPhone}
🚗 Vehicle: ${booking.vehicleNumber}

🗓️ *Trip Details:*
📅 Date: ${booking.pickupDate}
📍 Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `🏁 Drop: ${booking.dropLocation}` : ''}

Your driver will contact you shortly. Safe travels! 🛣️`;
}

export function generateInvoiceMessage(booking: any, invoiceUrl: string): string {
  return `🧾 *Invoice for Booking #${booking.bookingNumber || booking.id}*

📋 *Trip Details:*
Passenger: ${booking.passengerName}
Date: ${booking.pickupDate}
Vehicle: ${booking.cabType}
Amount: ₹${booking.totalAmount}

📄 *Download Invoice:*
${invoiceUrl}

Thank you for your business! 🙏`;
}

export function generateDriverNotificationMessage(booking: any): string {
  return `🚗 *New Trip Assignment*

📋 *Booking Details:*
Booking ID: ${booking.bookingNumber || booking.id}
Passenger: ${booking.passengerName}
📞 Contact: ${booking.passengerPhone}

🗓️ *Trip Information:*
📅 Date: ${booking.pickupDate}
📍 Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `🏁 Drop: ${booking.dropLocation}` : ''}
💰 Fare: ₹${booking.totalAmount}

Please contact the passenger and proceed to pickup location. 🚗`;
}
