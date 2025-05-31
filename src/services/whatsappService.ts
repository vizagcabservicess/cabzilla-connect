export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleanPhone = phone?.replace(/\D/g, '') || '';
  
  // If it starts with 91, return as is
  if (cleanPhone.startsWith('91')) {
    return cleanPhone;
  }
  
  // If it starts with +91, remove the +
  if (phone?.startsWith('+91')) {
    return cleanPhone;
  }
  
  // If it's a 10-digit Indian number, add 91
  if (cleanPhone.length === 10) {
    return '91' + cleanPhone;
  }
  
  return cleanPhone;
};

export const generateBookingConfirmationMessage = (booking: any): string => {
  const bookingId = booking?.bookingNumber ?? booking?.id ?? '';
  const passengerName = booking?.passengerName ?? booking?.customerName ?? 'Passenger';
  const passengerPhone = booking?.passengerPhone ?? booking?.customerPhone ?? '';
  const pickupDateTime = booking?.pickupDate ? new Date(booking.pickupDate) : null;
  const pickupDate = pickupDateTime ? pickupDateTime.toLocaleDateString() : '';
  const pickupTime = pickupDateTime ? pickupDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const vehicleType = booking?.cabType ?? booking?.vehicleType ?? '';
  const pickupLocation = booking?.pickupLocation ?? '';
  const tripType = booking?.tripType ?? '';
  const paymentStatus = booking?.payment_status ?? booking?.status ?? '';
  const amount = booking?.totalAmount ?? '';

  return (
    `🚕 *Booking Confirmed!* 🚕\n\n` +
    `*Booking #:* ${bookingId}\n` +
    `*Passenger:* ${passengerName}\n` +
    (passengerPhone ? `*Phone:* ${passengerPhone}\n` : '') +
    (pickupDate ? `*Pickup Date:* ${pickupDate}\n` : '') +
    (pickupTime ? `*Pickup Time:* ${pickupTime}\n` : '') +
    (vehicleType ? `*Vehicle Type:* ${vehicleType}\n` : '') +
    (pickupLocation ? `*Pickup Location:* ${pickupLocation}\n` : '') +
    (tripType ? `*Trip Type:* ${tripType}\n` : '') +
    (paymentStatus ? `*Payment Status:* ${paymentStatus}\n` : '') +
    (amount ? `*Amount:* ₹${amount}\n` : '') +
    `\nThank you for choosing our service!`
  );
};

export const generateInvoiceMessage = (booking: any, invoiceUrl?: string): string => {
  const bookingId = booking?.bookingNumber ?? booking?.id ?? '';
  const passengerName = booking?.passengerName ?? booking?.customerName ?? 'Passenger';
  const passengerPhone = booking?.passengerPhone ?? booking?.customerPhone ?? '';
  const pickupDateTime = booking?.pickupDate ? new Date(booking.pickupDate) : null;
  const pickupDate = pickupDateTime ? pickupDateTime.toLocaleDateString() : '';
  const pickupTime = pickupDateTime ? pickupDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const vehicleType = booking?.cabType ?? booking?.vehicleType ?? '';
  const pickupLocation = booking?.pickupLocation ?? '';
  const tripType = booking?.tripType ?? '';
  const paymentStatus = booking?.payment_status ?? booking?.status ?? '';
  const amount = booking?.totalAmount ?? '';
  const invoiceLink = invoiceUrl || booking?.invoiceUrl || '';

  return (
    `📄 *Invoice Details* 📄\n\n` +
    `*Booking #:* ${bookingId}\n` +
    `*Passenger:* ${passengerName}\n` +
    (passengerPhone ? `*Phone:* ${passengerPhone}\n` : '') +
    (pickupDate ? `*Pickup Date:* ${pickupDate}\n` : '') +
    (pickupTime ? `*Pickup Time:* ${pickupTime}\n` : '') +
    (vehicleType ? `*Vehicle Type:* ${vehicleType}\n` : '') +
    (pickupLocation ? `*Pickup Location:* ${pickupLocation}\n` : '') +
    (tripType ? `*Trip Type:* ${tripType}\n` : '') +
    (paymentStatus ? `*Payment Status:* ${paymentStatus}\n` : '') +
    (amount ? `*Amount:* ₹${amount}\n` : '') +
    (invoiceLink ? `\n*Download Invoice:* ${invoiceLink}\n` : '') +
    `\nThank you for choosing our service!`
  );
};

export const generateDriverAssignmentMessage = (booking: any, driver?: any): string => {
  const bookingId = booking?.bookingNumber ?? booking?.id ?? '';
  const passengerName = booking?.passengerName ?? booking?.customerName ?? 'Passenger';
  const passengerPhone = booking?.passengerPhone ?? booking?.customerPhone ?? '';
  const pickupDateTime = booking?.pickupDate ? new Date(booking.pickupDate) : null;
  const pickupDate = pickupDateTime ? pickupDateTime.toLocaleDateString() : '';
  const pickupTime = pickupDateTime ? pickupDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const vehicleType = booking?.cabType ?? booking?.vehicleType ?? '';
  const pickupLocation = booking?.pickupLocation ?? '';
  const tripType = booking?.tripType ?? '';
  const paymentStatus = booking?.payment_status ?? booking?.status ?? '';
  const amount = booking?.totalAmount ?? '';
  const driverName = driver?.name ?? booking?.driverName ?? 'N/A';
  const driverPhone = driver?.phone ?? booking?.driverPhone ?? 'N/A';
  const vehicleNumber = driver?.vehicleNumber ?? booking?.vehicleNumber ?? 'N/A';

  return (
    `🚗 *Driver Assigned!* 🚗\n\n` +
    `*Booking #:* ${bookingId}\n` +
    `*Passenger:* ${passengerName}\n` +
    (passengerPhone ? `*Phone:* ${passengerPhone}\n` : '') +
    (pickupDate ? `*Pickup Date:* ${pickupDate}\n` : '') +
    (pickupTime ? `*Pickup Time:* ${pickupTime}\n` : '') +
    (vehicleType ? `*Vehicle Type:* ${vehicleType}\n` : '') +
    (pickupLocation ? `*Pickup Location:* ${pickupLocation}\n` : '') +
    (tripType ? `*Trip Type:* ${tripType}\n` : '') +
    (paymentStatus ? `*Payment Status:* ${paymentStatus}\n` : '') +
    (amount ? `*Amount:* ₹${amount}\n` : '') +
    `\n*Driver Details:*\n` +
    `Name: ${driverName}\n` +
    `Phone: ${driverPhone}\n` +
    `Vehicle #: ${vehicleNumber}\n` +
    `\nYour driver will contact you soon!\nThank you for choosing our service!`
  );
};

export const generateDriverNotificationMessage = (booking: any): string => {
  return `🔔 New Booking Alert!\n\nBooking ID: ${booking?.id ?? ''}\nCustomer: ${booking?.customerName ?? booking?.passengerName ?? 'Customer'}\nPickup: ${booking?.pickupLocation ?? ''}\nDrop: ${booking?.dropLocation ?? ''}\n\nPlease confirm your availability.`;
};
