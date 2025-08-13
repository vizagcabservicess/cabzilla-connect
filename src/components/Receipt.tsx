import React from 'react';
import { formatDateTime } from '../lib/dateUtils';

interface ReceiptProps {
  booking: {
    id: number;
    bookingNumber: string;
    pickupLocation: string;
    dropLocation?: string;
    pickupDate: string;
    returnDate?: string;
    cabType: string;
    totalAmount: number;
    payment_status: string;
    payment_method: string;
    advance_paid_amount?: number;
    passengerName: string;
    passengerPhone: string;
    passengerEmail: string;
    tripType: string;
    tripMode?: string;
  };
}

const Receipt: React.FC<ReceiptProps> = ({ booking }) => {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const paymentStatus = booking.payment_status || 'pending';
  const advancePaidAmount = booking.advance_paid_amount || 0;
  const totalAmount = booking.totalAmount || 0;
  const remainingBalance = totalAmount - advancePaidAmount;

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-300 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="text-center border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Vizag Taxi Hub</h1>
        <p className="text-sm text-gray-600">Your Trusted Travel Partner</p>
        <p className="text-xs text-gray-500 mt-1">Phone: +91 9966363662</p>
        <p className="text-xs text-gray-500">Email: info@vizagtaxihub.com</p>
      </div>

      {/* Receipt Title */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">BOOKING RECEIPT</h2>
        <p className="text-sm text-gray-600">Booking #{booking.bookingNumber}</p>
        <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-IN')}</p>
      </div>

      {/* Customer Details */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-800 mb-2">Customer Details</h3>
        <div className="text-sm">
          <p><span className="font-medium">Name:</span> {booking.passengerName}</p>
          <p><span className="font-medium">Phone:</span> {booking.passengerPhone}</p>
          <p><span className="font-medium">Email:</span> {booking.passengerEmail}</p>
        </div>
      </div>

      {/* Trip Details */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-800 mb-2">Trip Details</h3>
        <div className="text-sm space-y-1">
          <p><span className="font-medium">From:</span> {booking.pickupLocation}</p>
          {booking.dropLocation && (
            <p><span className="font-medium">To:</span> {booking.dropLocation}</p>
          )}
          <p><span className="font-medium">Date:</span> {formatDateTime(booking.pickupDate)}</p>
          {booking.returnDate && (
            <p><span className="font-medium">Return:</span> {formatDateTime(booking.returnDate)}</p>
          )}
          <p><span className="font-medium">Vehicle:</span> {booking.cabType}</p>
          <p><span className="font-medium">Trip Type:</span> {booking.tripType}</p>
          {booking.tripMode && (
            <p><span className="font-medium">Mode:</span> {booking.tripMode}</p>
          )}
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-800 mb-2">Payment Details</h3>
        <div className="text-sm space-y-1">
          <p><span className="font-medium">Status:</span> 
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
              paymentStatus === 'payment_pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {paymentStatus === 'paid' ? 'PAID' : 
               paymentStatus === 'payment_pending' ? 'PARTIAL PAYMENT' : 'PENDING'}
            </span>
          </p>
          <p><span className="font-medium">Method:</span> {booking.payment_method || 'N/A'}</p>
        </div>
      </div>

      {/* Amount Breakdown */}
      <div className="border-t border-gray-300 pt-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Total Amount:</span>
            <span className="font-semibold">{formatPrice(totalAmount)}</span>
          </div>
          
          {advancePaidAmount > 0 && paymentStatus === 'payment_pending' && (
            <>
              <div className="flex justify-between text-green-600">
                <span>Amount Paid:</span>
                <span className="font-semibold">{formatPrice(advancePaidAmount)}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Balance Due:</span>
                <span className="font-semibold">{formatPrice(remainingBalance)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment Progress:</span>
                <span>{Math.round((advancePaidAmount / totalAmount) * 100)}% Complete</span>
              </div>
            </>
          )}
          
          {paymentStatus === 'paid' && (
            <div className="flex justify-between text-green-600">
              <span>Amount Paid:</span>
              <span className="font-semibold">{formatPrice(totalAmount)} (Full Payment)</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-4">
        <p>Thank you for choosing Vizag Taxi Hub!</p>
        <p className="mt-1">For any queries, contact us at +91 9966363662</p>
        <p className="mt-1">This is a computer generated receipt</p>
      </div>

      {/* Print Button */}
      <div className="mt-4 text-center">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Print Receipt
        </button>
      </div>
    </div>
  );
};

export default Receipt;

