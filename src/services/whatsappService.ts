/**
 * WhatsApp integration service for sharing booking details,
 * invoices, driver assignments and quotations via WhatsApp
 */

import { Booking } from '@/types/api';
import { getApiUrl } from '@/config/api';

/**
 * Format phone number for WhatsApp API
 * Removes any non-numeric characters and ensures international format
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove any non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Indian phone numbers specifically (most common for this app)
  if (cleaned.length === 10) {
    // Add India country code if it's a 10-digit number
    cleaned = '91' + cleaned;
  } else if (cleaned.startsWith('0')) {
    // Remove leading zero and add India code
    cleaned = '91' + cleaned.substring(1);
  } else if (!cleaned.startsWith('91') && cleaned.length > 10) {
    // If it has a country code but not 91, keep it as is
    // For now we don't handle other country codes specifically
  }
  
  return cleaned;
};

/**
 * Generate WhatsApp API URL to directly open a chat
 */
export const getWhatsAppUrl = (phone: string, message: string): string => {
  const formattedPhone = formatPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

/**
 * Generate message for booking confirmation
 */
export const generateBookingConfirmationMessage = (booking: Booking): string => {
  const pickupDate = new Date(booking.pickupDate).toLocaleString();
  
  return `
🚕 *Booking Confirmed* 🚕

Your booking with VizagUp has been confirmed.

*Booking Details:*
Booking #: ${booking.bookingNumber}
Passenger: ${booking.passengerName}
Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `Drop: ${booking.dropLocation}` : ''}
Date/Time: ${pickupDate}
Vehicle: ${booking.cabType}
Trip Type: ${booking.tripType}

*Amount:* ₹${booking.totalAmount.toFixed(2)}

Track your booking status online.

Thank you for choosing our service!
`;
};

/**
 * Generate message for driver assignment
 */
export const generateDriverAssignmentMessage = (booking: Booking): string => {
  if (!booking.driverName || !booking.driverPhone || !booking.vehicleNumber) {
    return '';
  }

  const pickupDate = new Date(booking.pickupDate).toLocaleString();
  
  return `
🚕 *Driver Assigned* 🚕

Good news! A driver has been assigned to your booking.

*Booking Details:*
Booking #: ${booking.bookingNumber}
Date/Time: ${pickupDate}

*Driver Details:*
Name: ${booking.driverName}
Phone: ${booking.driverPhone}
Vehicle #: ${booking.vehicleNumber}

You can contact your driver directly for any immediate assistance.

Thank you for choosing our service!
`;
};

/**
 * Generate message for invoice sharing
 */
export const generateInvoiceMessage = (booking: Booking, invoiceUrl?: string): string => {
  const isPaid = booking.payment_status === 'payment_received';
  const paymentMethod = booking.payment_method ? `Payment Method: ${booking.payment_method}` : '';
  
  return `
💰 *Invoice for Booking #${booking.bookingNumber}* 💰

*Trip Details:*
Date: ${new Date(booking.pickupDate).toLocaleDateString()}
From: ${booking.pickupLocation}
${booking.dropLocation ? `To: ${booking.dropLocation}` : ''}
Vehicle: ${booking.cabType}

*Amount:* ₹${booking.totalAmount.toFixed(2)}
*Status:* ${isPaid ? '✅ Paid' : '⏳ Payment Pending'}
${paymentMethod}

${invoiceUrl ? `View your invoice: ${invoiceUrl}` : ''}

Thank you for choosing our service!
`;
};

/**
 * Generate quotation message for fare estimates
 */
export const generateQuotationMessage = (
  tripDetails: {
    pickup: string;
    dropoff?: string;
    cabType: string;
    tripType: string;
    date: string;
  },
  fare: number
): string => {
  return `
💵 *Fare Quotation* 💵

We're pleased to provide you with the following fare quote:

*Trip Details:*
Date: ${new Date(tripDetails.date).toLocaleDateString()}
From: ${tripDetails.pickup}
${tripDetails.dropoff ? `To: ${tripDetails.dropoff}` : ''}
Vehicle Type: ${tripDetails.cabType}
Trip Type: ${tripDetails.tripType}

*Estimated Fare:* ₹${fare.toFixed(2)}

This quote is valid for 24 hours. To book this trip, please visit our website or reply to this message.

Thank you for your interest in our service!
`;
};

/**
 * Generate driver notification message
 * To be sent to drivers when they're assigned a booking
 */
export const generateDriverNotificationMessage = (booking: Booking): string => {
  const pickupDate = new Date(booking.pickupDate).toLocaleString();
  
  return `
🚕 *New Trip Assignment* 🚕

You have been assigned a new trip:

*Trip Details:*
Booking #: ${booking.bookingNumber}
Date/Time: ${pickupDate}
Pickup: ${booking.pickupLocation}
${booking.dropLocation ? `Drop: ${booking.dropLocation}` : ''}
Passenger: ${booking.passengerName}
Passenger Phone: ${booking.passengerPhone}

Please confirm this assignment by replying "CONFIRM ${booking.bookingNumber}".
`;
};

/**
 * Open WhatsApp with the given message
 */
export const openWhatsApp = (phone: string, message: string): void => {
  const url = getWhatsAppUrl(phone, message);
  window.open(url, '_blank');
};

/**
 * Share booking confirmation via WhatsApp
 */
export const shareBookingConfirmation = (booking: Booking): void => {
  const message = generateBookingConfirmationMessage(booking);
  openWhatsApp(booking.passengerPhone, message);
};

/**
 * Share driver assignment details via WhatsApp
 */
export const shareDriverAssignment = (booking: Booking): void => {
  const message = generateDriverAssignmentMessage(booking);
  openWhatsApp(booking.passengerPhone, message);
};

/**
 * Share invoice details via WhatsApp
 */
export const shareInvoice = (booking: Booking, invoiceUrl?: string): void => {
  const message = generateInvoiceMessage(booking, invoiceUrl);
  openWhatsApp(booking.passengerPhone, message);
};

/**
 * Share driver notification via WhatsApp
 */
export const notifyDriver = (booking: Booking): void => {
  if (!booking.driverPhone) return;
  
  const message = generateDriverNotificationMessage(booking);
  openWhatsApp(booking.driverPhone, message);
};

/**
 * Share fare quotation via WhatsApp
 */
export const shareFareQuotation = (
  phone: string, 
  tripDetails: {
    pickup: string;
    dropoff?: string;
    cabType: string;
    tripType: string;
    date: string;
  },
  fare: number
): void => {
  const message = generateQuotationMessage(tripDetails, fare);
  openWhatsApp(phone, message);
};

/**
 * Server-side WhatsApp messaging (for future integration with WhatsApp Business API)
 * Currently returns a mock success as actual integration requires business approval
 */
export const sendWhatsAppMessage = async (
  phone: string,
  messageType: 'booking_confirmation' | 'driver_assignment' | 'invoice' | 'quotation',
  data: any
): Promise<{ success: boolean; message: string }> => {
  try {
    // In the future, this will call the backend API
    const response = await fetch(getApiUrl('/api/admin/send-whatsapp.php'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formatPhoneNumber(phone),
        messageType,
        data
      }),
    });
    
    // For now, this endpoint doesn't exist, so we'll mock success
    // In the future, we'll process the actual response
    return { success: true, message: 'Message sent successfully (simulated)' };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, message: 'Failed to send WhatsApp message' };
  }
};

/**
 * WhatsApp service export
 */
export const whatsappService = {
  formatPhoneNumber,
  getWhatsAppUrl,
  openWhatsApp,
  shareBookingConfirmation,
  shareDriverAssignment,
  shareInvoice,
  notifyDriver,
  shareFareQuotation,
  sendWhatsAppMessage,
};

export default whatsappService;
