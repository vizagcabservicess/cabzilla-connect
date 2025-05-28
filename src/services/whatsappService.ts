
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // If it starts with 91, return as is
  if (cleanPhone.startsWith('91')) {
    return cleanPhone;
  }
  
  // If it starts with +91, remove the +
  if (phone.startsWith('+91')) {
    return cleanPhone;
  }
  
  // If it's a 10-digit Indian number, add 91
  if (cleanPhone.length === 10) {
    return '91' + cleanPhone;
  }
  
  return cleanPhone;
};

export const generateBookingConfirmationMessage = (booking: any): string => {
  return `🎉 Booking Confirmed!\n\nBooking ID: ${booking.id}\nFrom: ${booking.fromLocation}\nTo: ${booking.toLocation}\nSeats: ${booking.seatsBooked}\nAmount: ₹${booking.totalAmount}\n\nThank you for choosing our service!`;
};

export const generateDriverAssignmentMessage = (booking: any, driver: any): string => {
  return `🚗 Driver Assigned!\n\nBooking ID: ${booking.id}\nDriver: ${driver.name}\nPhone: ${driver.phone}\nVehicle: ${driver.vehicleNumber}\n\nYour driver will contact you soon!`;
};

export const generateInvoiceMessage = (booking: any): string => {
  return `📄 Invoice Details\n\nBooking ID: ${booking.id}\nAmount: ₹${booking.totalAmount}\nStatus: ${booking.status}\n\nDownload your invoice from our app.`;
};

export const generateDriverNotificationMessage = (booking: any): string => {
  return `🔔 New Booking Alert!\n\nBooking ID: ${booking.id}\nCustomer: ${booking.customerName}\nPickup: ${booking.pickupLocation}\nDrop: ${booking.dropLocation}\n\nPlease confirm your availability.`;
};
