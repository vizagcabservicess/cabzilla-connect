
export const generateDriverAssignmentMessage = (booking: any) => {
  return `Driver Assignment - Booking #${booking.bookingNumber}`;
};

export const generateDriverNotificationMessage = (booking: any) => {
  return `New booking assigned - #${booking.bookingNumber}`;
};
