
export const formatPhoneNumber = (phone: string): string => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 91, return as is
  if (cleaned.startsWith('91')) {
    return cleaned;
  }
  
  // If it starts with 0, remove it and add 91
  if (cleaned.startsWith('0')) {
    return '91' + cleaned.substring(1);
  }
  
  // If it's 10 digits, add 91
  if (cleaned.length === 10) {
    return '91' + cleaned;
  }
  
  return cleaned;
};

export const generateBookingConfirmationMessage = (booking: any) => {
  return `🚗 Booking Confirmed!

Booking #: ${booking.bookingNumber || booking.id}
Passenger: ${booking.passengerName}
Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `Drop: ${booking.dropLocation}` : ''}
Date: ${new Date(booking.pickupDate).toLocaleString()}
Vehicle: ${booking.cabType}
Amount: ₹${booking.totalAmount}

Thank you for choosing our service!`;
};

export const generateDriverAssignmentMessage = (booking: any) => {
  return `🚗 Driver Assigned - Booking #${booking.bookingNumber || booking.id}

Driver: ${booking.driverName}
Phone: ${booking.driverPhone}
Vehicle: ${booking.vehicleNumber}

Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `Drop: ${booking.dropLocation}` : ''}
Date: ${new Date(booking.pickupDate).toLocaleString()}

Your ride details are confirmed!`;
};

export const generateDriverNotificationMessage = (booking: any) => {
  return `🚗 New Trip Assignment

Booking #: ${booking.bookingNumber || booking.id}
Passenger: ${booking.passengerName}
Phone: ${booking.passengerPhone}

Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `Drop: ${booking.dropLocation}` : ''}
Date: ${new Date(booking.pickupDate).toLocaleString()}

Amount: ₹${booking.totalAmount}

Please contact the passenger and confirm pickup details.`;
};

export const generateInvoiceMessage = (booking: any, invoiceUrl?: string) => {
  return `📄 Invoice - Booking #${booking.bookingNumber || booking.id}

Passenger: ${booking.passengerName}
Amount: ₹${booking.totalAmount}
Date: ${new Date(booking.pickupDate).toLocaleString()}

${invoiceUrl ? `Download: ${invoiceUrl}` : 'Invoice details available in your account.'}

Thank you for your business!`;
};
