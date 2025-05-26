
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (digits.length === 10) {
    return `91${digits}`;
  }
  
  return digits;
}

export function generateBookingConfirmationMessage(booking: any): string {
  const pickupDate = booking.pickupDate ? new Date(booking.pickupDate).toLocaleString() : 'N/A';
  
  return `🚕 *Booking Confirmed* 🚕

Your booking with our cab service has been confirmed.

*Booking Details:*
Booking #: ${booking.bookingNumber || booking.id}
Passenger: ${booking.passengerName}
Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `Drop: ${booking.dropLocation}` : ''}
Date/Time: ${pickupDate}
Vehicle: ${booking.cabType}
Trip Type: ${booking.tripType}

*Amount:* ₹${booking.totalAmount?.toLocaleString() || 0}

Thank you for choosing our service!`;
}

export function generateDriverAssignmentMessage(booking: any): string {
  const pickupDate = booking.pickupDate ? new Date(booking.pickupDate).toLocaleString() : 'N/A';
  
  return `🚕 *Driver Assigned* 🚕

Good news! A driver has been assigned to your booking.

*Booking Details:*
Booking #: ${booking.bookingNumber || booking.id}
Date/Time: ${pickupDate}

*Driver Details:*
Name: ${booking.driverName}
Phone: ${booking.driverPhone}
Vehicle #: ${booking.vehicleNumber}

You can contact your driver directly for any assistance.

Thank you for choosing our service!`;
}

export function generateInvoiceMessage(booking: any, invoiceUrl?: string): string {
  const isPaid = booking.payment_status === 'payment_received' || booking.paymentStatus === 'paid';
  const pickupDate = booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString() : 'N/A';
  
  return `💰 *Invoice for Booking #${booking.bookingNumber || booking.id}* 💰

*Trip Details:*
Date: ${pickupDate}
From: ${booking.pickupLocation}
${booking.dropLocation ? `To: ${booking.dropLocation}` : ''}
Vehicle: ${booking.cabType}

*Amount:* ₹${booking.totalAmount?.toLocaleString() || 0}
*Status:* ${isPaid ? '✅ Paid' : '⏳ Payment Pending'}

${booking.paymentMethod ? `Payment Method: ${booking.paymentMethod}` : ''}

${invoiceUrl ? `View your invoice: ${invoiceUrl}` : ''}

Thank you for choosing our service!`;
}

export function generateDriverNotificationMessage(booking: any): string {
  const pickupDate = booking.pickupDate ? new Date(booking.pickupDate).toLocaleString() : 'N/A';
  
  return `🚗 *New Trip Assignment* 🚗

You have been assigned a new trip.

*Trip Details:*
Booking #: ${booking.bookingNumber || booking.id}
Passenger: ${booking.passengerName}
Phone: ${booking.passengerPhone}
Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `Drop: ${booking.dropLocation}` : ''}
Date/Time: ${pickupDate}
Vehicle: ${booking.vehicleNumber}

*Amount:* ₹${booking.totalAmount?.toLocaleString() || 0}

Please contact the passenger to confirm pickup details.`;
}
